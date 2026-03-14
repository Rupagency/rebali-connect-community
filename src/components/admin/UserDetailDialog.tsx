import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, ShieldCheck, ShieldAlert, AlertTriangle, Phone, UserCheck, Clock, Package, Handshake, Star, Wifi, Fingerprint } from 'lucide-react';

interface UserDetailDialogProps {
  userId: string | null;
  profile: any;
  onClose: () => void;
}

const FACTOR_LABELS: Record<string, { label: string; icon: any }> = {
  whatsapp_verified: { label: 'WhatsApp vérifié', icon: Phone },
  account_age: { label: 'Ancienneté du compte', icon: Clock },
  active_listings: { label: 'Annonces actives', icon: Package },
  completed_deals: { label: 'Deals complétés', icon: Handshake },
  positive_reviews: { label: 'Avis positifs (≥4★)', icon: Star },
  id_verified: { label: 'Identité vérifiée', icon: UserCheck },
  unresolved_reports: { label: 'Signalements non résolus', icon: ShieldAlert },
  fake_listings: { label: 'Annonces frauduleuses', icon: AlertTriangle },
  vpn_detected: { label: 'VPN détecté', icon: Wifi },
  multi_account: { label: 'Multi-compte', icon: Fingerprint },
};

export default function UserDetailDialog({ userId, profile, onClose }: UserDetailDialogProps) {
  const [trustData, setTrustData] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setTrustData(null);
      setListings([]);
      return;
    }

    let cancelled = false;

    const loadUserDetails = async () => {
      setLoading(true);
      setTrustData(null);
      setListings([]);

      try {
        const [trustRes, listingsRes] = await Promise.all([
          supabase.from('trust_scores').select('*').eq('user_id', userId).limit(1),
          supabase.from('listings').select('id, title_original, status, price, currency, category, created_at, views_count').eq('seller_id', userId).order('created_at', { ascending: false }).limit(20),
        ]);

        if (cancelled) return;

        if (trustRes.error) console.error('Failed to load trust score details:', trustRes.error);
        if (listingsRes.error) console.error('Failed to load user listings:', listingsRes.error);

        setTrustData((trustRes.data as any[] | null)?.[0] ?? null);
        setListings(listingsRes.data || []);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load user details dialog data:', error);
          setTrustData(null);
          setListings([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadUserDetails();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId || !profile) return null;

  const factors = (trustData?.factors as Record<string, number>) || {};
  const score = profile.trust_score ?? 50;

  const scoreColor = score < 30 ? 'text-destructive' : score < 60 ? 'text-amber-500' : 'text-primary';
  const riskBadge = profile.risk_level === 'high' ? 'destructive' : profile.risk_level === 'medium' ? 'outline' : 'secondary';

  return (
    <Dialog open={!!userId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogDescription className="sr-only">Détails du profil utilisateur</DialogDescription>
          <DialogTitle className="flex items-center gap-3">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                {(profile.display_name || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-lg">{profile.display_name || 'Sans nom'}</p>
              <p className="text-xs text-muted-foreground font-normal">
                {profile.user_type === 'business' ? 'Pro' : 'Particulier'} · Inscrit le {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-5">
            {/* Profile summary */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <Card><CardContent className="p-3">
                <p className={`text-2xl font-bold ${scoreColor}`}>{score}</p>
                <p className="text-xs text-muted-foreground">Trust Score</p>
              </CardContent></Card>
              <Card><CardContent className="p-3">
                <Badge variant={riskBadge as any} className="text-sm">{profile.risk_level || 'low'}</Badge>
                <p className="text-xs text-muted-foreground mt-1">Niveau de risque</p>
              </CardContent></Card>
              <Card><CardContent className="p-3">
                <p className="text-2xl font-bold">{listings.length}</p>
                <p className="text-xs text-muted-foreground">Annonces</p>
              </CardContent></Card>
            </div>

            {/* Verification status */}
            <div className="flex flex-wrap gap-2">
              <Badge variant={profile.phone_verified ? 'default' : 'outline'} className="gap-1">
                <Phone className="h-3 w-3" /> WhatsApp {profile.phone_verified ? '✓' : '✗'}
              </Badge>
              <Badge variant={profile.is_verified_seller ? 'default' : 'outline'} className="gap-1">
                <UserCheck className="h-3 w-3" /> ID {profile.is_verified_seller ? '✓' : '✗'}
              </Badge>
              {profile.is_banned && <Badge variant="destructive">Banni</Badge>}
            </div>

            <Separator />

            {/* Trust score breakdown */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Détail du calcul
              </h4>
              {Object.keys(factors).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun calcul disponible — recalculez le score.</p>
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
                    <span>Total</span>
                    <span className={scoreColor}>{score}/100</span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Listings */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" /> Annonces ({listings.length})
              </h4>
              {listings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune annonce</p>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {listings.map(l => (
                    <div key={l.id} className="flex items-center justify-between py-2 px-3 rounded-md border text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{l.title_original}</p>
                        <p className="text-xs text-muted-foreground">{l.category} · {new Date(l.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <span className="text-xs text-muted-foreground">{l.views_count} vues</span>
                        <Badge variant={l.status === 'active' ? 'default' : l.status === 'sold' ? 'secondary' : 'outline'} className="text-xs">
                          {l.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {trustData?.last_calculated && (
              <p className="text-xs text-muted-foreground text-right">
                Dernière mise à jour : {new Date(trustData.last_calculated).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
