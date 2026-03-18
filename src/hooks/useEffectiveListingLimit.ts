import { useAuth } from '@/contexts/AuthContext';
import { useProStatus } from '@/hooks/useProStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MAX_ACTIVE_LISTINGS } from '@/lib/constants';

/**
 * Returns the real effective listing limit for the current user,
 * accounting for: user_type, pro subscription tier, extra_listings addons,
 * listing_limit_override, and account age.
 */
export function useEffectiveListingLimit() {
  const { user, profile } = useAuth();
  const { listingLimit: proListingLimit, isPro } = useProStatus();

  // Fetch extra_listings addon slots (private users)
  const { data: extraSlots = 0 } = useQuery({
    queryKey: ['extra-listing-slots', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_addons')
        .select('extra_slots')
        .eq('user_id', user!.id)
        .eq('addon_type', 'extra_listings')
        .eq('active', true);
      return data?.reduce((sum, a) => sum + (a.extra_slots || 0), 0) || 0;
    },
    enabled: !!user && !isPro,
  });

  if (isPro) {
    return proListingLimit;
  }

  // Check admin override
  if (profile?.listing_limit_override != null) {
    return profile.listing_limit_override + extraSlots;
  }

  // Account age check (< 7 days = 3, otherwise 5)
  const accountAge = profile?.created_at
    ? Date.now() - new Date(profile.created_at).getTime()
    : Infinity;
  const baseLimit = accountAge < 7 * 24 * 60 * 60 * 1000 ? 3 : MAX_ACTIVE_LISTINGS;

  return baseLimit + extraSlots;
}
