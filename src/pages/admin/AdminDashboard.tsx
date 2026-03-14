import { useLanguage } from '@/contexts/LanguageContext';
import { useAdminProfiles, useAdminListings, useAdminReports, useAdminAnalyticsEvents, useAdminProSubscriptions } from '@/hooks/useAdminData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users, FileText, AlertTriangle, Ban, TrendingUp, DollarSign,
  ShieldCheck, ArrowUpRight, ArrowDownRight, UserPlus, Package
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { useMemo } from 'react';

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
  const { data: profiles } = useAdminProfiles();
  const { data: allListings } = useAdminListings();
  const { data: reports } = useAdminReports();
  const { data: events } = useAdminAnalyticsEvents();
  const { data: proSubs } = useAdminProSubscriptions();

  const pendingReports = reports?.filter((r: any) => !r.resolved) || [];
  const bannedUsers = profiles?.filter((p: any) => p.is_banned) || [];
  const activeListings = allListings?.filter((l: any) => l.status === 'active') || [];
  const businessUsers = profiles?.filter((p: any) => p.user_type === 'business') || [];
  const activeSubs = proSubs?.filter((s: any) => s.status === 'active' && new Date(s.expires_at) > new Date()) || [];

  // Growth analytics from analytics_events
  const analytics = useMemo(() => {
    if (!events?.length) return { signups7d: 0, signups30d: 0, listingsCreated7d: 0, dealsCompleted7d: 0, dailySignups: [], dailyListings: [] };

    const now = Date.now();
    const d7 = now - 7 * 86400000;
    const d30 = now - 30 * 86400000;

    const signups = events.filter((e: any) => e.event_type === 'signup');
    const listingEvents = events.filter((e: any) => e.event_type === 'listing_created');
    const dealEvents = events.filter((e: any) => e.event_type === 'deal_closed');

    // Daily signups for last 14 days
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

  // Monthly revenue estimate from active subscriptions
  const monthlyRevenue = activeSubs.reduce((sum: number, s: any) => sum + (s.price_idr || 0), 0);

  // New users this week vs previous
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
      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <KPICard icon={Users} label="Utilisateurs" value={profiles?.length || 0} trend={userGrowthPct} trendLabel="vs sem. précédente" />
        <KPICard icon={FileText} label="Annonces actives" value={activeListings.length} />
        <KPICard icon={AlertTriangle} label="Signalements" value={pendingReports.length} variant="destructive" />
        <KPICard icon={Ban} label="Bannis" value={bannedUsers.length} variant="destructive" />
        <KPICard icon={DollarSign} label="Revenus/mois" value={`${(monthlyRevenue / 1000).toFixed(0)}k IDR`} variant="success" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={UserPlus} label="Inscriptions (7j)" value={analytics.signups7d} />
        <KPICard icon={Package} label="Annonces créées (7j)" value={analytics.listingsCreated7d} />
        <KPICard icon={ShieldCheck} label="Deals confirmés (7j)" value={analytics.dealsCompleted7d} variant="success" />
        <KPICard icon={TrendingUp} label="Abonnements Pro actifs" value={activeSubs.length} variant="success" />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Signups & Listings chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inscriptions & Annonces (14 jours)</CardTitle>
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
                  <Area type="monotone" dataKey="signups" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name="Inscriptions" />
                  <Area type="monotone" dataKey="listings" stroke="hsl(var(--chart-2, 150 60% 50%))" fill="hsl(var(--chart-2, 150 60% 50%) / 0.15)" strokeWidth={2} name="Annonces" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User types breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Répartition utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-4">
              {[
                { label: 'Particuliers', count: (profiles?.length || 0) - businessUsers.length, color: 'bg-primary' },
                { label: 'Business / Pro', count: businessUsers.length, color: 'bg-emerald-500' },
                { label: 'Vendeurs vérifiés', count: profiles?.filter((p: any) => p.is_verified_seller).length || 0, color: 'bg-blue-500' },
                { label: 'Téléphone vérifié', count: profiles?.filter((p: any) => p.phone_verified).length || 0, color: 'bg-amber-500' },
                { label: 'Bannis', count: bannedUsers.length, color: 'bg-destructive' },
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
          { label: 'Total annonces', value: allListings?.length || 0 },
          { label: 'Actives', value: activeListings.length },
          { label: 'Vendues', value: allListings?.filter((l: any) => l.status === 'sold').length || 0 },
          { label: 'Archivées', value: allListings?.filter((l: any) => l.status === 'archived').length || 0 },
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
