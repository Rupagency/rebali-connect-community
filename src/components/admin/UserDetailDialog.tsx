import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, ShieldAlert, AlertTriangle, Phone, UserCheck, Clock, Package, Handshake, Star, Wifi, Fingerprint, Mail, KeyRound, ShieldOff } from 'lucide-react';

interface UserDetailDialogProps {
  userId: string | null;
  profile: any;
  onClose: () => void;
}

export default function UserDetailDialog({ userId, profile, onClose }: UserDetailDialogProps) {
  const { t } = useLanguage();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const FACTOR_LABELS: Record<string, { label: string; icon: any }> = {
    whatsapp_verified: { label: t('adminPage.whatsappVerified'), icon: Phone },
    account_age: { label: t('adminPage.accountAge'), icon: Clock },
    active_listings: { label: t('adminPage.activeListingsLabel'), icon: Package },
    completed_deals: { label: t('adminPage.completedDeals'), icon: Handshake },
    positive_reviews: { label: t('adminPage.positiveReviews'), icon: Star },
    id_verified: { label: t('adminPage.idVerified'), icon: UserCheck },
    unresolved_reports: { label: t('adminPage.unresolvedReports'), icon: ShieldAlert },
    fake_listings: { label: t('adminPage.fakeListings'), icon: AlertTriangle },
    vpn_detected: { label: t('adminPage.vpnDetected'), icon: Wifi },
    multi_account: { label: t('adminPage.multiAccount'), icon: Fingerprint },
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-detail-dialog', userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const [trustRes, listingsRes, userInfoRes] = await Promise.all([
        supabase.from('trust_scores').select('*').eq('user_id', userId!).maybeSingle(),
        supabase
          .from('listings')
          .select('id, title_original, status, price, currency, category, created_at, views_count')
          .eq('seller_id', userId!)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.functions.invoke('admin-user-actions', {
          body: { action: 'get_user_info', user_id: userId },
        }),
      ]);

      if (trustRes.error) console.error('Failed to load trust score details:', trustRes.error);
      if (listingsRes.error) console.error('Failed to load user listings:', listingsRes.error);

      return {
        trustData: trustRes.data ?? null,
        listings: listingsRes.data || [],
        userInfo: userInfoRes.data ?? null,
      };
    },
  });

  const trustData = data?.trustData ?? null;
  const listings = data?.listings ?? [];
  const userInfo = data?.userInfo ?? null;
  const loading = !!userId && isLoading;

  if (!userId || !profile) return null;

  const factors = (trustData?.factors as Record<string, number>) || {};
  const score = profile.trust_score ?? 50;

  const scoreColor = score < 30 ? 'text-destructive' : score < 60 ? 'text-amber-500' : 'text-primary';
  const riskBadge = profile.risk_level === 'high' ? 'destructive' : profile.risk_level === 'medium' ? 'outline' : 'secondary';

  const handleResetPassword = async () => {
    if (!confirm(`Envoyer un email de reset de mot de passe à ${userInfo?.email || 'cet utilisateur'} ?`)) return;
    setActionLoading('reset_password');
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-actions', {
        body: { action: 'reset_password', user_id: userId },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: 'Email de reset envoyé', description: `Envoyé à ${data.email}` });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const handleDisableMfa = async () => {
    if (!confirm('Supprimer la double authentification de cet utilisateur ?')) return;
    setActionLoading('disable_mfa');
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-actions', {
        body: { action: 'disable_mfa', user_id: userId },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast({ title: '2FA désactivée', description: `${data.factors_removed || 0} facteur(s) supprimé(s)` });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
    setActionLoading(null);
  };

  return (
    <Dialog open={!!userId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogDescription className="sr-only">{t('adminPage.scoreBreakdown')}</DialogDescription>
          <DialogTitle className="flex items-center gap-3">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                {(profile.display_name || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-lg">{profile.display_name || t('adminPage.noName')}</p>
              <p className="text-xs text-muted-foreground font-normal">
                {profile.user_type === 'business' ? t('common.pro') : t('common.private')} · {t('adminPage.registeredOn')} {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-5">
            {/* Email & Auth Info */}
            {userInfo && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{userInfo.email || 'No email'}</span>
                    {userInfo.email_confirmed && (
                      <Badge variant="secondary" className="text-xs">Confirmé</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <span>2FA : {userInfo.mfa_enabled ? (
                      <Badge variant="default" className="text-xs">
                        {userInfo.mfa_method === 'email' ? '📧 Email' : '📱 Authenticator'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Désactivée</Badge>
                    )}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Admin Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetPassword}
                disabled={!!actionLoading}
                className="gap-1.5"
              >
                {actionLoading === 'reset_password' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                Reset mot de passe
              </Button>
              {userInfo?.mfa_enabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisableMfa}
                  disabled={!!actionLoading}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  {actionLoading === 'disable_mfa' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
                  Supprimer 2FA
                </Button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <Card><CardContent className="p-3">
                <p className={`text-2xl font-bold ${scoreColor}`}>{score}</p>
                <p className="text-xs text-muted-foreground">{t('security.trustScore')}</p>
              </CardContent></Card>
              <Card><CardContent className="p-3">
                <Badge variant={riskBadge as any} className="text-sm">{profile.risk_level || 'low'}</Badge>
                <p className="text-xs text-muted-foreground mt-1">{t('security.riskLevel')}</p>
              </CardContent></Card>
              <Card><CardContent className="p-3">
                <p className="text-2xl font-bold">{listings.length}</p>
                <p className="text-xs text-muted-foreground">{t('admin.listings')}</p>
              </CardContent></Card>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={profile.phone_verified ? 'default' : 'outline'} className="gap-1">
                <Phone className="h-3 w-3" /> WhatsApp {profile.phone_verified ? '✓' : '✗'}
              </Badge>
              <Badge variant={profile.is_verified_seller ? 'default' : 'outline'} className="gap-1">
                <UserCheck className="h-3 w-3" /> ID {profile.is_verified_seller ? '✓' : '✗'}
              </Badge>
              {profile.is_banned && <Badge variant="destructive">{t('admin.banned')}</Badge>}
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> {t('adminPage.scoreBreakdown')}
              </h4>
              {Object.keys(factors).length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('adminPage.noScoreAvailable')}</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(factors).map(([key, value]) => {
                    const meta = FACTOR_LABELS[key] || { label: key, icon: ShieldCheck };
                    const Icon = meta.icon;
                    const isNeg = value < 0;
                    return (
                      <div key={key} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/40">
                        <div className="flex items-center gap-2 text-sm">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span>{meta.label}</span>
                        </div>
                        <span className={`font-mono font-bold text-sm ${isNeg ? 'text-destructive' : value > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                          {value > 0 ? `+${value}` : value}
                        </span>
                      </div>
                    );
                  })}
                  <Separator />
                  <div className="flex items-center justify-between py-1.5 px-3 font-bold">
                    <span>{t('adminPage.totalLabel')}</span>
                    <span className={scoreColor}>{score}/100</span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" /> {t('admin.listings')} ({listings.length})
              </h4>
              {listings.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('adminPage.noListingsFound')}</p>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {listings.map(l => (
                    <a
                      key={l.id}
                      href={`/listing/${l.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between py-2 px-3 rounded-md border text-sm hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{l.title_original}</p>
                        <p className="text-xs text-muted-foreground">{l.category} · {new Date(l.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <span className="text-xs text-muted-foreground">{l.views_count} {t('adminPage.viewsLabel')}</span>
                        <Badge variant={l.status === 'active' ? 'default' : l.status === 'sold' ? 'secondary' : 'outline'} className="text-xs">
                          {l.status}
                        </Badge>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {trustData?.last_calculated && (
              <p className="text-xs text-muted-foreground text-right">
                {t('adminPage.lastUpdated')} : {new Date(trustData.last_calculated).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
