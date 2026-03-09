import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ProTier = 'free_pro' | 'vendeur_pro' | 'agence' | null;

export interface ProSubscription {
  id: string;
  plan_type: string;
  status: string;
  started_at: string;
  expires_at: string;
  price_idr: number;
  monthly_boosts_included: number;
  monthly_boosts_used: number;
  monthly_boosts_reset_at: string | null;
}

export function useProStatus() {
  const { user, profile } = useAuth();
  const isPro = profile?.user_type === 'business';

  const { data: subscription, refetch: refetchSubscription } = useQuery({
    queryKey: ['pro-subscription', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('pro_subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      return (data?.[0] as ProSubscription | undefined) || null;
    },
    enabled: !!user && isPro,
  });

  // Fetch purchased boost packs
  const { data: purchasedBoosts = 0 } = useQuery({
    queryKey: ['pro-purchased-boosts', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('pro_boost_purchases')
        .select('boosts_remaining')
        .eq('user_id', user!.id)
        .gt('boosts_remaining', 0);
      return data?.reduce((sum, p) => sum + (p.boosts_remaining || 0), 0) || 0;
    },
    enabled: !!user && isPro,
  });

  const tier: ProTier = !isPro ? null :
    subscription?.plan_type === 'agence' ? 'agence' :
    subscription?.plan_type === 'vendeur_pro' ? 'vendeur_pro' :
    'free_pro';

  const monthlyBoostsRemaining = subscription
    ? Math.max(0, (subscription.monthly_boosts_included || 0) - (subscription.monthly_boosts_used || 0))
    : 0;

  const totalBoostsAvailable = monthlyBoostsRemaining + purchasedBoosts;

  const listingLimit = tier === 'agence' ? 9999 : tier === 'vendeur_pro' ? 20 : 5;
  const maxPhotos = tier === 'free_pro' ? 3 : 10;
  const hasAnalytics = tier === 'vendeur_pro' || tier === 'agence';
  const hasAdvancedAnalytics = tier === 'agence';

  return {
    isPro,
    tier,
    subscription,
    monthlyBoostsRemaining,
    purchasedBoosts,
    totalBoostsAvailable,
    listingLimit,
    maxPhotos,
    hasAnalytics,
    hasAdvancedAnalytics,
    refetchSubscription,
  };
}
