import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProStatus } from '@/hooks/useProStatus';
import { supabase } from '@/integrations/supabase/client';
import { getListingImageUrl } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { isNativePlatform } from '@/capacitor';
import { openExternalAuthenticated, openOrNavigate, WEBAPP_URL } from '@/lib/openExternal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ProBadge from '@/components/ProBadge';
import { toast } from '@/hooks/use-toast';
import {
  Eye, Heart, MessageCircle, TrendingUp, BarChart3, Crown, Lock,
  Rocket, Package, ShieldCheck, Building2, Zap, CreditCard, ArrowUpRight
} from 'lucide-react';

// --- Sub-components ---

function TierHeader({ tier, subscription, t }: any) {
  const tierLabels: Record<string, string> = {
    free_pro: t('pro.freePro'),
    vendeur_pro: t('pro.vendeurPro'),
    agence: t('pro.agence'),
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          {t('pro.proDashboard')}
        </h1>
        <p className="text-sm text-muted-foreground">{tierLabels[tier] || t('pro.freePro')}</p>
      </div>
      <ProBadge tier={tier} />
    </div>
  );
}

function BoostPurchaseModal({ open, onOpenChange, t }: any) {
  const [buying, setBuying] = useState<string | null>(null);

  const handleBuy = async (packId: string) => {
    setBuying(packId);
    try {
      const { data, error } = await supabase.functions.invoke('xendit-create-invoice', {
        body: { type: 'pro_boosts', pack_id: packId },
      });
      if (error || data?.error) {
        const errKey = data?.error === 'hourly_limit' ? 'paymentHourlyLimit'
          : data?.error === 'daily_limit' ? 'paymentDailyLimit' : null;
        toast({ title: errKey ? t(`security.${errKey}`) : (data?.error || 'Payment error'), variant: 'destructive' });
      } else if (data?.invoice_url) {
        await openOrNavigate(data.invoice_url);
      }
    } catch {
      toast({ title: 'Payment error', variant: 'destructive' });
    }
    setBuying(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            {t('pro.buyBoosts')}
          </DialogTitle>
          <DialogDescription>{t('pro.buyBoostsDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <button
            onClick={() => handleBuy('boost_1')}
            disabled={buying === 'boost_1'}
            className="w-full p-4 rounded-xl border-2 hover:border-primary/50 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold">{t('pro.boostUnit')}</p>
                <p className="text-xs text-muted-foreground">48h {t('pro.perBoost')}</p>
              </div>
            </div>
            <p className="font-bold text-primary">Rp 20.000</p>
          </button>
          <button
            onClick={() => handleBuy('boost_10')}
            disabled={buying === 'boost_10'}
            className="w-full p-4 rounded-xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all flex items-center justify-between relative"
          >
            <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px]">
              {t('pro.bestValue')}
            </Badge>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold">{t('pro.boostPack')}</p>
                <p className="text-xs text-muted-foreground">10 × 48h</p>
              </div>
            </div>
            <p className="font-bold text-primary">Rp 150.000</p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ListingsPerformance({ listings, statsMap, t, navigate }: any) {
  const [sortBy, setSortBy] = useState<'views' | 'favs' | 'wa'>('views');

  const sorted = useMemo(() => {
    return [...listings].sort((a: any, b: any) => {
      if (sortBy === 'views') return (b.views_count || 0) - (a.views_count || 0);
      if (sortBy === 'favs') return (statsMap[b.id]?.favs || 0) - (statsMap[a.id]?.favs || 0);
      return (statsMap[b.id]?.waClicks || 0) - (statsMap[a.id]?.waClicks || 0);
    });
  }, [listings, statsMap, sortBy]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t('dashboard.listingsPerformance')}</CardTitle>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="views">{t('dashboard.sortViews')}</SelectItem>
              <SelectItem value="favs">{t('dashboard.sortFavorites')}</SelectItem>
              <SelectItem value="wa">{t('dashboard.sortWaClicks')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">{t('dashboard.noListings')}</p>
        ) : (
          <div className="space-y-3">
            {sorted.map((listing: any) => {
              const imgUrl = listing.listing_images?.[0]?.storage_path
                ? getListingImageUrl(listing.listing_images[0].storage_path)
                : '/placeholder.svg';
              const stats = statsMap[listing.id] || { favs: 0, waClicks: 0, convos: 0 };

              return (
                <div
                  key={listing.id}
                  className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/listing/${listing.id}`)}
                >
                  <img src={imgUrl} alt="" className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{listing.title_original}</h3>
                    <Badge variant={listing.status === 'active' ? 'default' : 'secondary'} className="text-[10px] mt-0.5">
                      {listing.status === 'active' ? t('dashboard.active') : t('dashboard.sold')}
                    </Badge>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {listing.views_count || 0}</span>
                      <span className="flex items-center gap-1 text-rose-500"><Heart className="h-3.5 w-3.5" /> {stats.favs}</span>
                      <span className="flex items-center gap-1 text-green-600"><MessageCircle className="h-3.5 w-3.5" /> {stats.waClicks}</span>
                      <span className="flex items-center gap-1 text-primary">💬 {stats.convos}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Main Component ---

export default function SellerDashboard() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const {
    isPro, tier, subscription, monthlyBoostsRemaining,
    purchasedBoosts, totalBoostsAvailable, listingLimit,
    hasAnalytics, hasAdvancedAnalytics,
  } = useProStatus();
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('30d');
  const [boostModalOpen, setBoostModalOpen] = useState(false);

  // Fetch listings
  const { data: listings = [] } = useQuery({
    queryKey: ['dashboard-listings', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('listings')
        .select('id, title_original, status, views_count, created_at, category, price, currency, listing_images(storage_path, sort_order)')
        .eq('seller_id', user!.id)
        .in('status', ['active', 'sold'])
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user && isPro,
  });

  const listingIds = listings.map((l: any) => l.id);

  // Fetch favorites
  const { data: favCounts = [] } = useQuery({
    queryKey: ['dashboard-favs', listingIds],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_listing_fav_counts', { _listing_ids: listingIds });
      return data || [];
    },
    enabled: listingIds.length > 0 && hasAnalytics,
  });

  // Fetch WA clicks
  const { data: waClicks = [] } = useQuery({
    queryKey: ['dashboard-wa-clicks', user?.id, period],
    queryFn: async () => {
      let query = supabase.from('whatsapp_click_logs').select('listing_id').in('listing_id', listingIds);
      if (period === '7d') query = query.gte('clicked_at', new Date(Date.now() - 7 * 86400000).toISOString());
      else if (period === '30d') query = query.gte('clicked_at', new Date(Date.now() - 30 * 86400000).toISOString());
      const { data } = await query;
      return data || [];
    },
    enabled: listingIds.length > 0 && hasAnalytics,
  });

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ['dashboard-convos', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('conversations').select('listing_id').eq('seller_id', user!.id);
      return data || [];
    },
    enabled: !!user && hasAnalytics,
  });

  // Aggregate stats
  const statsMap = useMemo(() => {
    const map: Record<string, { favs: number; waClicks: number; convos: number }> = {};
    listingIds.forEach(id => { map[id] = { favs: 0, waClicks: 0, convos: 0 }; });
    favCounts.forEach((f: any) => { if (map[f.listing_id]) map[f.listing_id].favs = f.fav_count; });
    waClicks.forEach((w: any) => { if (map[w.listing_id]) map[w.listing_id].waClicks++; });
    conversations.forEach((c: any) => { if (map[c.listing_id]) map[c.listing_id].convos++; });
    return map;
  }, [listingIds, favCounts, waClicks, conversations]);

  const totals = useMemo(() => {
    const totalViews = listings.reduce((sum: number, l: any) => sum + (l.views_count || 0), 0);
    const totalFavs = Object.values(statsMap).reduce((sum, s) => sum + s.favs, 0);
    const totalWaClicks = Object.values(statsMap).reduce((sum, s) => sum + s.waClicks, 0);
    const totalConvos = Object.values(statsMap).reduce((sum, s) => sum + s.convos, 0);
    const activeCount = listings.filter((l: any) => l.status === 'active').length;
    const soldCount = listings.filter((l: any) => l.status === 'sold').length;
    return { totalViews, totalFavs, totalWaClicks, totalConvos, activeCount, soldCount };
  }, [listings, statsMap]);

  useEffect(() => {
    if (!user) navigate('/auth', { replace: true });
  }, [user, navigate]);

  if (!user) return null;

  // Not a business account
  if (!isPro) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg text-center space-y-4">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{t('pro.proDashboard')}</h1>
        <p className="text-muted-foreground">{t('pro.proAccountRequired')}</p>
        <Button onClick={() => navigate('/profile')}>{t('dashboard.goToProfile')}</Button>
      </div>
    );
  }

  const conversionRate = totals.totalViews > 0
    ? ((totals.totalConvos / totals.totalViews) * 100).toFixed(1)
    : '0';

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      <TierHeader tier={tier} subscription={subscription} t={t} />

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Listings count */}
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-1">
            <Package className="h-4 w-4 text-primary" />
            <p className="text-2xl font-bold">{totals.activeCount}<span className="text-sm font-normal text-muted-foreground">/{listingLimit === 9999 ? '∞' : listingLimit}</span></p>
            <p className="text-xs text-muted-foreground">{t('pro.activeListings')}</p>
          </CardContent>
        </Card>

        {/* Boosts */}
        <Card className={tier !== 'free_pro' ? 'border-accent/20' : ''}>
          <CardContent className="p-4 space-y-1">
            <Rocket className="h-4 w-4 text-accent" />
            <p className="text-2xl font-bold">{totalBoostsAvailable}</p>
            <p className="text-xs text-muted-foreground">{t('pro.boostsAvailable')}</p>
            {tier !== 'free_pro' && subscription && (
              <p className="text-[10px] text-muted-foreground">
                {monthlyBoostsRemaining} {t('pro.monthly')} + {purchasedBoosts} {t('pro.purchased')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Views (analytics only) */}
        {hasAnalytics ? (
          <Card>
            <CardContent className="p-4 space-y-1">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{totals.totalViews.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{t('dashboard.totalViews')}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-4 space-y-1 opacity-50">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">{t('pro.analytics')}</p>
              <p className="text-[10px] text-muted-foreground">{t('pro.upgradeForAnalytics')}</p>
            </CardContent>
          </Card>
        )}

        {/* Conversion / Contacts */}
        {hasAnalytics ? (
          <Card>
            <CardContent className="p-4 space-y-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-2xl font-bold">{hasAdvancedAnalytics ? `${conversionRate}%` : totals.totalWaClicks}</p>
              <p className="text-xs text-muted-foreground">
                {hasAdvancedAnalytics ? t('dashboard.conversionRate') : t('dashboard.waClicks')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-4 space-y-1 opacity-50">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">{t('pro.stats')}</p>
              <p className="text-[10px] text-muted-foreground">{t('pro.upgradeForAnalytics')}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => {
          if (isNativePlatform) {
            openExternalAuthenticated(`${WEBAPP_URL}/dashboard`);
          } else {
            setBoostModalOpen(true);
          }
        }} variant="outline" className="gap-2">
          <Rocket className="h-4 w-4" /> {t('pro.buyBoosts')}
        </Button>
        <Button onClick={() => {
          if (isNativePlatform) {
            openExternalAuthenticated(`${WEBAPP_URL}/pro-subscription`);
          } else {
            navigate('/pro-subscription');
          }
        }} variant="outline" className="gap-2">
          <Crown className="h-4 w-4" /> {t('pro.manageSub')}
        </Button>
        <Button onClick={() => navigate('/create')} className="gap-2">
          <Package className="h-4 w-4" /> {t('nav.sell')}
        </Button>
      </div>

      {/* Subscription Info */}
      {subscription && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{t('pro.currentPlan')}: {tier === 'agence' ? t('pro.agence') : t('pro.vendeurPro')}</p>
              <p className="text-xs text-muted-foreground">
                {t('pro.renewalDate')}: {new Date(subscription.expires_at).toLocaleDateString()}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/pro-subscription')}>
              {t('pro.manageSub')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Period selector for analytics */}
      {hasAnalytics && (
        <div className="flex justify-end">
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t('dashboard.last7days')}</SelectItem>
              <SelectItem value="30d">{t('dashboard.last30days')}</SelectItem>
              <SelectItem value="all">{t('dashboard.allTime')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Analytics summary (Vendeur Pro + Agence) */}
      {hasAnalytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 space-y-1">
              <Heart className="h-4 w-4 text-rose-500" />
              <p className="text-2xl font-bold">{totals.totalFavs}</p>
              <p className="text-xs text-muted-foreground">{t('dashboard.totalFavorites')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-1">
              <MessageCircle className="h-4 w-4 text-green-500" />
              <p className="text-2xl font-bold">{totals.totalWaClicks}</p>
              <p className="text-xs text-muted-foreground">{t('dashboard.waClicks')}</p>
            </CardContent>
          </Card>
          {hasAdvancedAnalytics && (
            <>
              <Card>
                <CardContent className="p-4 space-y-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <p className="text-2xl font-bold">{totals.totalConvos}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.conversations')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-1">
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  <p className="text-2xl font-bold">{totals.soldCount}</p>
                  <p className="text-xs text-muted-foreground">{t('dashboard.sold')}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Listings Performance (analytics users) */}
      {hasAnalytics && (
        <ListingsPerformance listings={listings} statsMap={statsMap} t={t} navigate={navigate} />
      )}

      {/* Free Pro upgrade prompt */}
      {tier === 'free_pro' && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6 text-center space-y-3">
            <Crown className="h-10 w-10 text-primary mx-auto" />
            <h3 className="text-lg font-bold">{t('pro.upgradeTitle')}</h3>
            <p className="text-sm text-muted-foreground">{t('pro.upgradeDesc')}</p>
            <Button onClick={() => navigate('/pro-subscription')} className="gap-2">
              <Crown className="h-4 w-4" /> {t('pro.viewPlans')}
            </Button>
          </CardContent>
        </Card>
      )}

      <BoostPurchaseModal open={boostModalOpen} onOpenChange={setBoostModalOpen} t={t} />
    </div>
  );
}
