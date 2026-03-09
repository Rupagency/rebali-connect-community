import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Crown, Zap, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Props {
  userId: string;
  showStock?: boolean;
}

export default function ActiveSellerStatus({ userId, showStock = true }: Props) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['active-seller-status', userId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data: addons } = await supabase
        .from('user_addons')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .in('addon_type', ['active_seller', 'expert_seller', 'boost'])
        .gte('expires_at', now);
      return addons || [];
    },
    staleTime: 60 * 1000,
  });

  if (!data || data.length === 0) return null;

  const sellerStatus = data.find(a => a.addon_type === 'active_seller' || a.addon_type === 'expert_seller');
  const stockBoosts = data.filter(a => a.addon_type === 'boost' && !a.listing_id);

  if (!sellerStatus && stockBoosts.length === 0) return null;

  const getRemainingTime = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}${t('sellerStatus.daysShort')} ${hours}h`;
    return `${hours}h`;
  };

  const isExpert = sellerStatus?.addon_type === 'expert_seller';
  const Icon = isExpert ? Crown : TrendingUp;
  const colorClass = isExpert
    ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600'
    : 'bg-amber-500/10 border-amber-500/20 text-amber-600';

  return (
    <Card className={`border ${isExpert ? 'border-cyan-500/20' : 'border-amber-500/20'}`}>
      <CardContent className="p-4 space-y-3">
        {sellerStatus && (
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">
                  {t(`points.addon.${sellerStatus.addon_type}`)}
                </span>
                <Badge className={`text-[10px] ${colorClass}`}>
                  {t('sellerStatus.active')}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Clock className="h-3 w-3" />
                <span>
                  {t('sellerStatus.remaining')}: {getRemainingTime(sellerStatus.expires_at!) || t('sellerStatus.expired')}
                </span>
              </div>
            </div>
          </div>
        )}

        {showStock && stockBoosts.length > 0 && (
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Zap className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {stockBoosts.length} {t('sellerStatus.boostsInStock')}
              </p>
              <p className="text-[10px] text-muted-foreground">{t('sellerStatus.boostsDesc')}</p>
            </div>
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => navigate('/my-listings')}>
              {t('sellerStatus.use')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
