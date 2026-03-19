import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "@/integrations/supabase/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolve a listing image storage_path to a displayable URL.
 * If the path is already a full URL (e.g. Unsplash), return it as-is.
 * Otherwise, build a Supabase Storage public URL.
 */
export function getListingImageUrl(
  storagePath: string,
  bucket = "listings",
  /** Optional: request a resized version via Supabase Image Transformation */
  transform?: { width?: number; height?: number; quality?: number }
): string {
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
    return storagePath;
  }

  if (transform) {
    return supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath, { transform })
      .data.publicUrl;
  }

  return supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
}

type ListingImageInput = {
  storage_path?: string | null;
  sort_order?: number | null;
};

/**
 * Build an ordered list of image candidates for a listing.
 * Includes a final fallback image to avoid broken image icons.
 */
export function getListingImageCandidates(
  listingImages: ListingImageInput[] | null | undefined,
  fallbackImage: string,
  bucket = "listings",
  /** Pass transform to request resized thumbnails */
  transform?: { width?: number; height?: number; quality?: number }
): string[] {
  const resolved = (listingImages ?? [])
    .filter((image): image is ListingImageInput & { storage_path: string } => {
      return typeof image?.storage_path === "string" && image.storage_path.trim().length > 0;
    })
    .sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER))
    .map((image) => getListingImageUrl(image.storage_path.trim(), bucket, transform));

  return resolved.length > 0 ? [...new Set([...resolved, fallbackImage])] : [fallbackImage];
}
