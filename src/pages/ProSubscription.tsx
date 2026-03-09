import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProStatus, type ProTier } from '@/hooks/useProStatus';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Check, Crown, Building2, ShieldCheck, Rocket, BarChart3, Package, Image, Lock, Bell } from 'lucide-react';

const TIERS = [
  {
    id: 'free_pro' as ProTier,
    price: 0,
    features: [
      { key: 'listings', value: '5' },
      { key: 'photos', value: '3' },
      { key: 'boosts', value: '0' },
      { key: 'badge', value: false },
      { key: 'analytics', value: false },
      { key: 'searchAlerts', value: '0' },
    ],
  },
  {
    id: 'vendeur_pro' as ProTier,
    price: 99000,
    features: [
      { key: 'listings', value: '20' },
      { key: 'photos', value: '∞' },
      { key: 'boosts', value: '5' },
      { key: 'badge', value: 'Pro Vérifié' },
      { key: 'analytics', value: 'basic' },
      { key: 'searchAlerts', value: '3' },
    ],
  },
  {
    id: 'agence' as ProTier,
    price: 249000,
    features: [
      { key: 'listings', value: '∞' },
      { key: 'photos', value: '∞' },
      { key: 'boosts', value: '10' },
      { key: 'badge', value: 'Business Certifié' },
      { key: 'analytics', value: 'advanced' },
      { key: 'searchAlerts', value: '∞' },
    ],
  },
];

export default function ProSubscription() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { isPro, tier, subscription } = useProStatus();
  const navigate = useNavigate();
  const [subscribing, setSubscribing] = useState<string | null>(null);

  if (!user) { navigate('/auth'); return null; }
  if (!isPro) { navigate('/profile'); return null; }

  const handleSubscribe = async (planType: string) => {
    if (planType === 'free_pro') return; // Free, no action
    setSubscribing(planType);
    try {
      const { data, error } = await supabase.functions.invoke('xendit-create-invoice', {
        body: { type: 'pro_subscription', plan_type: planType },
      });
      if (error || data?.error) {
        toast({ title: data?.error || 'Payment error', variant: 'destructive' });
      } else if (data?.invoice_url) {
        const a = document.createElement('a');
        a.href = data.invoice_url;
        a.target = '_self';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch {
      toast({ title: 'Payment error', variant: 'destructive' });
    }
    setSubscribing(null);
  };

  const getIcon = (tierId: ProTier) => {
    if (tierId === 'agence') return Building2;
    if (tierId === 'vendeur_pro') return ShieldCheck;
    return Package;
  };

  const featureIcon = (key: string) => {
    switch (key) {
      case 'listings': return Package;
      case 'photos': return Image;
      case 'boosts': return Rocket;
      case 'badge': return ShieldCheck;
      case 'analytics': return BarChart3;
      case 'searchAlerts': return Bell;
      default: return Check;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Crown className="h-6 w-6 text-primary" />
          {t('pro.subscriptionTitle')}
        </h1>
        <p className="text-muted-foreground">{t('pro.subscriptionDesc')}</p>
      </div>

      {/* Current plan info */}
      {subscription && (
        <Card className="border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('pro.currentPlan')}: {tier === 'agence' ? t('pro.agence') : t('pro.vendeurPro')}</p>
              <p className="text-xs text-muted-foreground">{t('pro.renewalDate')}: {new Date(subscription.expires_at).toLocaleDateString()}</p>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20">{t('pro.active')}</Badge>
          </CardContent>
        </Card>
      )}

      {/* Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIERS.map((tierInfo) => {
          const isCurrent = tier === tierInfo.id;
          const TierIcon = getIcon(tierInfo.id);
          const isPopular = tierInfo.id === 'vendeur_pro';

          return (
            <Card
              key={tierInfo.id}
              className={`relative transition-all ${
                isCurrent ? 'border-primary ring-2 ring-primary/20' : ''
              } ${isPopular ? 'border-primary/50' : ''}`}
            >
              {isPopular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px]">
                  {t('pro.popular')}
                </Badge>
              )}
              {isCurrent && (
                <Badge className="absolute -top-2.5 right-3 text-[10px] bg-primary">
                  {t('pro.currentPlan')}
                </Badge>
              )}
              <CardHeader className="text-center pb-2 pt-6">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <TierIcon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{tierInfo.id === 'free_pro' ? t('pro.freePro') : tierInfo.id === 'vendeur_pro' ? t('pro.vendeurPro') : t('pro.agence')}</CardTitle>
                <div className="mt-2">
                  {tierInfo.price === 0 ? (
                    <p className="text-2xl font-bold text-primary">{t('common.free')}</p>
                  ) : (
                    <p className="text-2xl font-bold text-primary">
                      Rp {tierInfo.price.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground">{t('pro.perMonth')}</span>
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {tierInfo.features.map((feat) => {
                  const FeatIcon = featureIcon(feat.key);
                  const isDisabled = feat.value === false || feat.value === '0';
                  return (
                    <div
                      key={feat.key}
                      className={`flex items-center gap-2 text-sm ${isDisabled ? 'text-muted-foreground/50' : ''}`}
                    >
                      {isDisabled ? (
                        <Lock className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                      ) : (
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                      <span>
                        {t(`pro.feat.${feat.key}`)}: <strong>{
                          typeof feat.value === 'boolean'
                            ? (feat.value ? '✓' : '✗')
                            : feat.value === '∞' ? t('pro.unlimited') : feat.value
                        }</strong>
                        {feat.key === 'boosts' && feat.value !== '0' && feat.value !== false && ` ${t('pro.perMonth')}`}
                      </span>
                    </div>
                  );
                })}

                <div className="pt-3">
                  {isCurrent ? (
                    <Button disabled className="w-full" variant="outline">
                      {t('pro.currentPlan')}
                    </Button>
                  ) : tierInfo.id === 'free_pro' ? (
                    <Button disabled className="w-full" variant="outline">
                      {t('pro.freePro')}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      disabled={subscribing === tierInfo.id}
                      onClick={() => handleSubscribe(tierInfo.id!)}
                    >
                      {subscribing === tierInfo.id ? '...' : (
                        tier && TIERS.findIndex(t => t.id === tier) > TIERS.findIndex(t => t.id === tierInfo.id)
                          ? t('pro.downgrade')
                          : t('pro.upgrade')
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
        ← {t('pro.backToDashboard')}
      </Button>
    </div>
  );
}
