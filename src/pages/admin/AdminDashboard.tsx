import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminProfiles, useAdminListings, useAdminReports, useAdminAnalyticsEvents, useAdminProSubscriptions } from '@/hooks/useAdminData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, FileText, AlertTriangle, Ban, TrendingUp, DollarSign,
  ShieldCheck, ArrowUpRight, ArrowDownRight, UserPlus, Package, Sprout
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

function KPICard({ icon: Icon, label, value, trend, trendLabel, variant = 'default' }: {
  icon: any; label: string; value: number | string; trend?: number; trendLabel?: string;
  variant?: 'default' | 'destructive' | 'success';
}) {
  const colorClass = variant === 'destructive' ? 'text-destructive' : variant === 'success' ? 'text-emerald-600' : 'text-primary';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className={`h-5 w-5 ${colorClass}`} />
          {trend !== undefined && (
            <Badge variant={trend >= 0 ? 'default' : 'destructive'} className="text-[10px] gap-0.5">
              {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trend)}%
            </Badge>
          )}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {trendLabel && <p className="text-[10px] text-muted-foreground mt-0.5">{trendLabel}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { session } = useAuth();
  const { data: profiles } = useAdminProfiles();
  const { data: allListings } = useAdminListings();
  const { data: reports } = useAdminReports();
  const { data: events } = useAdminAnalyticsEvents();
  const { data: proSubs } = useAdminProSubscriptions();
  const [seeding, setSeeding] = useState(false);
  const [purging, setPurging] = useState(false);

  const invokeSeedFunction = async (payload: Record<string, unknown>) => {
    if (!session?.access_token) throw new Error('Session expirée, reconnecte-toi puis réessaie');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Erreur HTTP ${res.status}`);
      return json;
    } catch (err: any) {
      if (err?.name === 'AbortError') throw new Error('Timeout de la requête purge/seed. Réessaie.');
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  };

  const handlePurgeSeed = async () => {
    if (!confirm('Supprimer TOUTES les annonces et profils seed (@seed.rebali.test) ?')) return;
    setPurging(true);
    const toastId = toast.loading('🗑️ Purge en cours… Recherche des utilisateurs seed…', { duration: Infinity, position: 'bottom-right' });
    try {
      toast.loading('🗑️ Suppression des annonces, images, conversations…', { id: toastId, position: 'bottom-right' });
      const data = await invokeSeedFunction({ action: 'purge' });
      toast.success(`✅ Purge terminée !\n${data?.deleted_listings || 0} annonces supprimées\n${data?.deleted_users || 0} utilisateurs supprimés`, { id: toastId, duration: 8000, position: 'bottom-right' });
    } catch (err: any) {
      toast.error(`❌ Erreur purge : ${err.message}`, { id: toastId, duration: 8000, position: 'bottom-right' });
    } finally {
      setPurging(false);
    }
  };

  const handleSeed = async () => {
    const totalTarget = 350;
    const batchSize = 30;
    if (!confirm(`Créer ~${totalTarget} fausses annonces en lots de ${batchSize} ?`)) return;
    setSeeding(true);
    let totalCreated = 0;
    try {
      for (let i = 0; i < Math.ceil(totalTarget / batchSize); i++) {
        const remaining = totalTarget - totalCreated;
        const thisCount = Math.min(batchSize, remaining);
        toast.info(`Lot ${i + 1}/${Math.ceil(totalTarget / batchSize)} (${thisCount} annonces)...`);
        const data = await invokeSeedFunction({ count: thisCount });
        totalCreated += data?.created || thisCount;
      }
      toast.success(`✅ Seed terminé : ${totalCreated} annonces créées`);
    } catch (err: any) {
      toast.error(`Erreur seed au lot (${totalCreated} créées) : ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const pendingReports = reports?.filter((r: any) => !r.resolved) || [];
  const bannedUsers = profiles?.filter((p: any) => p.is_banned) || [];
  const activeListings = allListings?.filter((l: any) => l.status === 'active') || [];
  const businessUsers = profiles?.filter((p: any) => p.user_type === 'business') || [];
  const activeSubs = proSubs?.filter((s: any) => s.status === 'active' && new Date(s.expires_at) > new Date()) || [];

  const analytics = useMemo(() => {
    if (!events?.length) return { signups7d: 0, signups30d: 0, listingsCreated7d: 0, dealsCompleted7d: 0, dailySignups: [] };

    const now = Date.now();
    const d7 = now - 7 * 86400000;
    const d30 = now - 30 * 86400000;

    const signups = events.filter((e: any) => e.event_type === 'signup');
    const listingEvents = events.filter((e: any) => e.event_type === 'listing_created');
    const dealEvents = events.filter((e: any) => e.event_type === 'deal_closed');

    const days14: Record<string, { signups: number; listings: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      days14[d.toISOString().slice(0, 10)] = { signups: 0, listings: 0 };
    }
    signups.forEach((e: any) => {
      const key = e.created_at?.slice(0, 10);
      if (key && key in days14) days14[key].signups++;
    });
    listingEvents.forEach((e: any) => {
      const key = e.created_at?.slice(0, 10);
      if (key && key in days14) days14[key].listings++;
    });

    return {
      signups7d: signups.filter((e: any) => new Date(e.created_at).getTime() > d7).length,
      signups30d: signups.filter((e: any) => new Date(e.created_at).getTime() > d30).length,
      listingsCreated7d: listingEvents.filter((e: any) => new Date(e.created_at).getTime() > d7).length,
      dealsCompleted7d: dealEvents.filter((e: any) => new Date(e.created_at).getTime() > d7).length,
      dailySignups: Object.entries(days14).map(([date, v]) => ({ date: date.slice(5), ...v })),
    };
  }, [events]);

  const monthlyRevenue = activeSubs.reduce((sum: number, s: any) => sum + (s.price_idr || 0), 0);

  const usersThisWeek = profiles?.filter((p: any) => {
    const d = new Date(p.created_at).getTime();
    return d > Date.now() - 7 * 86400000;
  }).length || 0;
  const usersPrevWeek = profiles?.filter((p: any) => {
    const d = new Date(p.created_at).getTime();
    return d > Date.now() - 14 * 86400000 && d <= Date.now() - 7 * 86400000;
  }).length || 0;
  const userGrowthPct = usersPrevWeek > 0 ? Math.round(((usersThisWeek - usersPrevWeek) / usersPrevWeek) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Seed button */}
      <div className="flex justify-end gap-2">
        <Button variant="destructive" size="sm" onClick={handlePurgeSeed} disabled={purging || seeding}>
          <Ban className="h-4 w-4 mr-2" />
          {purging ? 'Purge en cours...' : 'Purge seed'}
        </Button>
        <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding || purging}>
          <Sprout className="h-4 w-4 mr-2" />
          {seeding ? 'Seed en cours...' : 'Seed 350 annonces'}
        </Button>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <KPICard icon={Users} label={t('admin.users')} value={profiles?.length || 0} trend={userGrowthPct} trendLabel={t('adminPage.vsPrevWeek')} />
        <KPICard icon={FileText} label={t('adminPage.activeLabel')} value={activeListings.length} />
        <KPICard icon={AlertTriangle} label={t('admin.reports')} value={pendingReports.length} variant="destructive" />
        <KPICard icon={Ban} label={t('admin.banned')} value={bannedUsers.length} variant="destructive" />
        <KPICard icon={DollarSign} label={t('adminPage.monthlyRevenue')} value={`${(monthlyRevenue / 1000).toFixed(0)}k IDR`} variant="success" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={UserPlus} label={t('adminPage.signups7d')} value={analytics.signups7d} />
        <KPICard icon={Package} label={t('adminPage.listingsCreated7d')} value={analytics.listingsCreated7d} />
        <KPICard icon={ShieldCheck} label={t('adminPage.dealsConfirmed7d')} value={analytics.dealsCompleted7d} variant="success" />
        <KPICard icon={TrendingUp} label={t('adminPage.activeProSubs')} value={activeSubs.length} variant="success" />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('adminPage.signupsAndListings')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.dailySignups}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="signups" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name={t('adminPage.signupsTab')} />
                  <Area type="monotone" dataKey="listings" stroke="hsl(var(--chart-2, 150 60% 50%))" fill="hsl(var(--chart-2, 150 60% 50%) / 0.15)" strokeWidth={2} name={t('adminPage.listingsTab')} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('adminPage.userBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-4">
              {[
                { label: t('adminPage.privateUsers'), count: (profiles?.length || 0) - businessUsers.length, color: 'bg-primary' },
                { label: t('adminPage.businessPro'), count: businessUsers.length, color: 'bg-emerald-500' },
                { label: t('adminPage.verifiedSellers'), count: profiles?.filter((p: any) => p.is_verified_seller).length || 0, color: 'bg-blue-500' },
                { label: t('adminPage.phoneVerifiedLabel'), count: profiles?.filter((p: any) => p.phone_verified).length || 0, color: 'bg-amber-500' },
                { label: t('admin.banned'), count: bannedUsers.length, color: 'bg-destructive' },
              ].map(item => {
                const total = profiles?.length || 1;
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{item.label}</span>
                      <span className="font-medium">{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Listings breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('admin.totalListings'), value: allListings?.length || 0 },
          { label: t('adminPage.activeLabel'), value: activeListings.length },
          { label: t('adminPage.sold'), value: allListings?.filter((l: any) => l.status === 'sold').length || 0 },
          { label: t('myListings.archived'), value: allListings?.filter((l: any) => l.status === 'archived').length || 0 },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
