import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Batch-fetch active boosts for a list of listing IDs (1 query instead of N)
 */
export function useListingBoosts(listingIds: string[]) {
  return useQuery({
    queryKey: ['listing-boosts-batch', listingIds.sort().join(',')],
    queryFn: async () => {
      if (listingIds.length === 0) return new Map<string, string[]>();
      const { data } = await supabase.rpc('get_active_boosts', {
        _listing_ids: listingIds,
      });
      const map = new Map<string, string[]>();
      (data || []).forEach((row: any) => {
        const existing = map.get(row.listing_id) || [];
        existing.push(row.addon_type);
        map.set(row.listing_id, existing);
      });
      return map;
    },
    staleTime: 2 * 60 * 1000,
    enabled: listingIds.length > 0,
  });
}

/**
 * Batch-fetch favorites counts for a list of listing IDs (1 query instead of N)
 */
export function useListingFavCounts(listingIds: string[]) {
  return useQuery({
    queryKey: ['listing-fav-counts-batch', listingIds.sort().join(',')],
    queryFn: async () => {
      if (listingIds.length === 0) return new Map<string, number>();
      const { data } = await supabase.rpc('get_listing_fav_counts', {
        _listing_ids: listingIds,
      });
      const map = new Map<string, number>();
      (data || []).forEach((row: any) => {
        map.set(row.listing_id, row.fav_count);
      });
      return map;
    },
    staleTime: 60 * 1000,
    enabled: listingIds.length > 0,
  });
}
