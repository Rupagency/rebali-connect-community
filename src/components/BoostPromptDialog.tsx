import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import ConfettiEffect from '@/components/ConfettiEffect';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isNativePlatform } from '@/capacitor';
import { openExternalAuthenticated, WEBAPP_URL } from '@/lib/openExternal';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, Star, Zap } from 'lucide-react';

interface BoostPromptDialogProps {
  listingId: string;
  open: boolean;
  onClose: () => void;
}

export default function BoostPromptDialog({ listingId, open, onClose }: BoostPromptDialogProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [purchasing, setPurchasing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confirmBoostType, setConfirmBoostType] = useState<string | null>(null);

  // Fetch user's stock boosts
  const { data: stockBoosts = [] } = useQuery({
    queryKey: ['stock-boosts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('user_addons')
        .select('id, listing_id, addon_type, expires_at')
        .eq('user_id', user.id)
        .eq('active', true)
        .eq('addon_type', 'boost')
        .is('listing_id', null);
      return (data || []).filter(b => b.expires_at && new Date(b.expires_at).getTime() > Date.now());
    },
    enabled: !!user && open,
  });

  // Fetch user points balance
  const { data: pointsData } = useQuery({
    queryKey: ['user-points', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && open,
  });

  const balance = pointsData?.balance ?? 0;
  const stockBoostCount = stockBoosts.length;

  const handleClose = () => {
    setConfirmBoostType(null);
    onClose();
  };

  const useStockBoost = async () => {
    setPurchasing(true);
    const { data, error } = await supabase.functions.invoke('manage-points', {
      body: { action: 'use_stock_boost', listing_id: listingId },
    });
    if (error || data?.error) {
      const msg = data?.error === 'already_boosted'
        ? t('points.boost.alreadyBoosted')
        : data?.error === 'no_stock_boosts'
        ? t('points.boost.noStockBoosts')
        : t('points.purchaseError');
      toast({ title: msg, variant: 'destructive' });
    } else {
      toast({ title: t('points.boost.stockApplied') });
      setShowConfetti(true);
      qc.invalidateQueries({ queryKey: ['stock-boosts'] });
      qc.invalidateQueries({ queryKey: ['my-boosts'] });
      setTimeout(() => { setShowConfetti(false); handleClose(); }, 2000);
      setPurchasing(false);
      return;
    }
    setPurchasing(false);
    handleClose();
  };

  const purchaseBoost = async () => {
    if (!confirmBoostType) return;
    setPurchasing(true);
    const { data, error } = await supabase.functions.invoke('manage-points', {
      body: { action: 'purchase', addon_type: confirmBoostType, listing_id: listingId },
    });
    if (error || data?.error) {
      const msg = data?.error === 'insufficient_points'
        ? t('points.insufficientPoints')
        : data?.error === 'already_boosted'
        ? t('points.boost.alreadyBoosted')
        : t('points.purchaseError');
      toast({ title: msg, variant: 'destructive' });
    } else {
      toast({ title: t('points.purchaseSuccess') });
      setShowConfetti(true);
      qc.invalidateQueries({ queryKey: ['stock-boosts'] });
      qc.invalidateQueries({ queryKey: ['my-boosts'] });
      setTimeout(() => { setShowConfetti(false); setConfirmBoostType(null); handleClose(); }, 2000);
      setPurchasing(false);
      return;
    }
    setPurchasing(false);
    setConfirmBoostType(null);
    handleClose();
  };

  // On native, keep dialog inline (no redirect) — payment links use Capacitor Browser

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !showConfetti) handleClose(); }}>
      <DialogContent className="relative z-[60] max-w-sm max-h-[85vh] overflow-y-auto border-border bg-popover text-popover-foreground shadow-lg">
        {showConfetti && <ConfettiEffect count={50} />}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            🔥 {t('points.boost.dialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {confirmBoostType ? t('points.boost.dialogConfirm') : t('points.boost.dialogChoose')}
          </DialogDescription>
        </DialogHeader>

        {!confirmBoostType ? (
          <div className="space-y-3">
            {/* Stock boost */}
            {stockBoostCount > 0 && (
              <button
                onClick={useStockBoost}
                disabled={purchasing}
                className="w-full p-4 rounded-xl border-2 border-emerald-300 hover:border-emerald-500 bg-emerald-500/5 transition-colors flex items-center gap-3 text-left"
              >
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{t('points.boost.useStock')}</p>
                  <p className="text-xs text-muted-foreground">{t('points.boost.useStockDesc').replace('{count}', String(stockBoostCount))}</p>
                </div>
                <Badge className="bg-emerald-500 text-white">{t('points.boost.free')}</Badge>
              </button>
            )}

            {/* Boost 48h */}
            <button
              onClick={() => setConfirmBoostType('boost')}
              className="w-full p-4 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-colors flex items-center gap-3 text-left"
            >
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Rocket className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{t('points.boost.boost48h')}</p>
                <p className="text-xs text-muted-foreground">{t('points.boost.boost48hDesc')}</p>
              </div>
              <span className="font-bold text-primary text-sm">50 pts</span>
            </button>

            {/* Premium */}
            <button
              onClick={() => setConfirmBoostType('boost_premium')}
              className="w-full p-4 rounded-xl border-2 border-amber-200 hover:border-amber-400 transition-colors flex items-center gap-3 text-left"
            >
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{t('points.boost.premium')}</p>
                <p className="text-xs text-muted-foreground">{t('points.boost.premiumDesc')}</p>
              </div>
              <span className="font-bold text-primary text-sm">100 pts</span>
            </button>

            {/* Balance indicator */}
            <p className="text-xs text-center text-muted-foreground">
              💰 {balance} pts
            </p>

            {/* Skip */}
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleClose}>
              {t('common.skip') || 'Skip'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border-2 border-primary/20 bg-muted/50 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${confirmBoostType === 'boost_premium' ? 'bg-amber-500/10' : 'bg-blue-500/10'}`}>
                {confirmBoostType === 'boost_premium' ? <Star className="h-5 w-5 text-amber-500" /> : <Rocket className="h-5 w-5 text-blue-500" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{confirmBoostType === 'boost_premium' ? t('points.boost.premium') : t('points.boost.boost48h')}</p>
                <p className="text-xs text-muted-foreground">{confirmBoostType === 'boost_premium' ? '100 pts' : '50 pts'}</p>
              </div>
            </div>
            <p className="text-sm text-center text-muted-foreground">
              {t('points.boost.confirmQuestion')}
            </p>
            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setConfirmBoostType(null)} disabled={purchasing}>
                {t('points.boost.back')}
              </Button>
              <Button onClick={purchaseBoost} disabled={purchasing}>
                {purchasing ? '...' : t('points.boost.confirm')}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
