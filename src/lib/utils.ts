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
export function getListingImageUrl(storagePath: string, bucket = 'listings'): string {
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath;
  }
  return supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
}
