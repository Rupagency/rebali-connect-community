import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, UserPlus, DollarSign, ShoppingCart, TrendingUp, Globe,
  Smartphone, Monitor, ArrowUpRight, ArrowDownRight, Loader2, Eye,
  MessageCircle, Star, Calendar
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useMemo, useState } from 'react';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 150 60% 50%))',
  'hsl(var(--chart-3, 30 80% 55%))',
  'hsl(var(--chart-4, 280 65% 60%))',
  'hsl(var(--chart-5, 200 70% 50%))',
  'hsl(340 75% 55%)',
  'hsl(60 70% 45%)',
  'hsl(180 60% 45%)',
];

function useAdminStatsData() {
  const { session, isAdmin } = useAuth();
  const ready = !!session && isAdmin;

  const profiles = useQuery({
    queryKey: ['admin-stats-profiles'],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, created_at, user_type, preferred_lang, phone_verified, is_verified_seller, is_banned, referral_code, referred_by').order('created_at', { ascending: false });
      return data || [];
    },
    staleTime: 60_000,
  });

  const listings = useQuery({
    queryKey: ['admin-stats-listings'],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase.from('listings').select('id, created_at, status, category, location_area, price, currency, views_count, listing_type').order('created_at', { ascending: false });
      return data || [];
    },
    staleTime: 60_000,
  });

  const conversations = useQuery({
    queryKey: ['admin-stats-conversations'],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase.from('conversations').select('id, created_at, deal_closed, deal_closed_at, buyer_confirmed, total_msg_count, unlocked').order('created_at', { ascending: false });
      return data || [];
    },
    staleTime: 60_000,
  });

  const invoices = useQuery({
    queryKey: ['admin-stats-invoices'],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase.from('payment_invoices').select('id, created_at, status, amount_idr, invoice_type, plan_type, paid_at').order('created_at', { ascending: false });
      return data || [];
    },
    staleTime: 60_000,
  });

  const proSubs = useQuery({
    queryKey: ['admin-stats-pro-subs'],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase.from('pro_subscriptions').select('id, created_at, status, plan_type, price_idr, expires_at, started_at').order('created_at', { ascending: false });
      return data || [];
    },
    staleTime: 60_000,
  });

  const devices = useQuery({
    queryKey: ['admin-stats-devices'],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase.from('user_devices').select('id, user_id, browser, os, created_at').order('created_at', { ascending: false });
      return data || [];
    },
    staleTime: 60_000,
  });

  const events = useQuery({
    queryKey: ['admin-stats-events'],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase.from('analytics_events').select('*').order('created_at', { ascending: false }).limit(5000);
      return data || [];
    },
    staleTime: 60_000,
  });

  const isLoading = profiles.isLoading || listings.isLoading || conversations.isLoading || invoices.isLoading;

  return {
    profiles: profiles.data || [],
    listings: listings.data || [],
    conversations: conversations.data || [],
    invoices: invoices.data || [],
    proSubs: proSubs.data || [],
    devices: devices.data || [],
    events: events.data || [],
    isLoading,
  };
}

type Period = 'day' | 'week' | 'month' | 'year';

function groupByPeriod(items: any[], dateField: string, period: Period, days: number) {
  const now = Date.now();
  const cutoff = now - days * 86400000;
  const filtered = items.filter(i => new Date(i[dateField]).getTime() > cutoff);

  const buckets: Record<string, number> = {};

  if (period === 'day') {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    filtered.forEach(i => {
      const key = i[dateField]?.slice(0, 10);
      if (key && key in buckets) buckets[key]++;
    });
  } else if (period === 'week') {
    for (let i = Math.ceil(days / 7) - 1; i >= 0; i--) {
      const d = new Date(now - i * 7 * 86400000);
      const weekStart = new Date(d);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = `S${weekStart.toISOString().slice(5, 10)}`;
      buckets[key] = 0;
    }
    filtered.forEach(i => {
      const d = new Date(i[dateField]);
      const weekStart = new Date(d);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = `S${weekStart.toISOString().slice(5, 10)}`;
      if (key in buckets) buckets[key]++;
    });
  } else if (period === 'month') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      buckets[d.toISOString().slice(0, 7)] = 0;
    }
    filtered.forEach(i => {
      const key = i[dateField]?.slice(0, 7);
      if (key && key in buckets) buckets[key]++;
    });
  } else {
    filtered.forEach(i => {
      const key = i[dateField]?.slice(0, 4);
      if (key) buckets[key] = (buckets[key] || 0) + 1;
    });
  }

  return Object.entries(buckets).map(([label, count]) => ({ label, count }));
}

function KPICard({ icon: Icon, label, value, trend, variant = 'default', subtitle }: {
  icon: any; label: string; value: number | string; trend?: number; variant?: 'default' | 'destructive' | 'success'; subtitle?: string;
}) {
  const colorClass = variant === 'destructive' ? 'text-destructive' : variant === 'success' ? 'text-emerald-600' : 'text-primary';
  return (
    <Card className="hover:shadow-md transition-shadow">
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
        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function PeriodSelector({ value, onChange }: { value: Period; onChange: (v: Period) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Period)}>
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="day">Par jour</SelectItem>
        <SelectItem value="week">Par semaine</SelectItem>
        <SelectItem value="month">Par mois</SelectItem>
        <SelectItem value="year">Par an</SelectItem>
      </SelectContent>
    </Select>
  );
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--background))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

export default function AdminStats() {
  const { profiles, listings, conversations, invoices, proSubs, devices, events, isLoading } = useAdminStatsData();
  const [period, setPeriod] = useState<Period>('day');

  const daysForPeriod = period === 'day' ? 30 : period === 'week' ? 90 : period === 'month' ? 365 : 1095;

  // ── KPI calculations ──
  const kpis = useMemo(() => {
    const now = Date.now();
    const d7 = now - 7 * 86400000;
    const d30 = now - 30 * 86400000;
    const d14_7 = now - 14 * 86400000;

    const signups7d = profiles.filter(p => new Date(p.created_at).getTime() > d7).length;
    const signups7d_prev = profiles.filter(p => {
      const t = new Date(p.created_at).getTime();
      return t > d14_7 && t <= d7;
    }).length;
    const signupGrowth = signups7d_prev > 0 ? Math.round(((signups7d - signups7d_prev) / signups7d_prev) * 100) : 0;

    const paidInvoices = invoices.filter(i => i.status === 'paid');
    const revenue30d = paidInvoices.filter(i => new Date(i.paid_at || i.created_at).getTime() > d30).reduce((s, i) => s + (i.amount_idr || 0), 0);
    const totalRevenue = paidInvoices.reduce((s, i) => s + (i.amount_idr || 0), 0);

    const deals = conversations.filter(c => c.deal_closed && c.buyer_confirmed);
    const deals7d = deals.filter(c => new Date(c.deal_closed_at || c.created_at).getTime() > d7).length;

    const activeListings = listings.filter(l => l.status === 'active').length;
    const totalViews = listings.reduce((s, l) => s + (l.views_count || 0), 0);

    const activeSubs = proSubs.filter(s => s.status === 'active' && new Date(s.expires_at).getTime() > now).length;

    return { signups7d, signupGrowth, revenue30d, totalRevenue, deals7d, totalDeals: deals.length, activeListings, totalViews, activeSubs, totalUsers: profiles.length, totalListings: listings.length };
  }, [profiles, listings, conversations, invoices, proSubs]);

  // ── Time series ──
  const signupSeries = useMemo(() => groupByPeriod(profiles, 'created_at', period, daysForPeriod), [profiles, period, daysForPeriod]);
  const listingSeries = useMemo(() => groupByPeriod(listings, 'created_at', period, daysForPeriod), [listings, period, daysForPeriod]);
  const dealSeries = useMemo(() => groupByPeriod(
    conversations.filter(c => c.deal_closed),
    'deal_closed_at', period, daysForPeriod
  ), [conversations, period, daysForPeriod]);
  const revenueSeries = useMemo(() => {
    const paid = invoices.filter(i => i.status === 'paid');
    const cutoff = Date.now() - daysForPeriod * 86400000;
    const filtered = paid.filter(i => new Date(i.paid_at || i.created_at).getTime() > cutoff);
    const buckets: Record<string, number> = {};
    signupSeries.forEach(s => { buckets[s.label] = 0; });
    filtered.forEach(i => {
      const d = i.paid_at || i.created_at;
      let key: string;
      if (period === 'day') key = d.slice(0, 10);
      else if (period === 'month') key = d.slice(0, 7);
      else key = d.slice(0, 4);
      if (key in buckets) buckets[key] += (i.amount_idr || 0);
    });
    return Object.entries(buckets).map(([label, amount]) => ({ label, amount: Math.round(amount / 1000) }));
  }, [invoices, signupSeries, period, daysForPeriod]);

  // ── User breakdown ──
  const userBreakdown = useMemo(() => {
    const langMap: Record<string, number> = {};
    const typeMap: Record<string, number> = {};
    profiles.forEach(p => {
      langMap[p.preferred_lang || 'en'] = (langMap[p.preferred_lang || 'en'] || 0) + 1;
      typeMap[p.user_type || 'private'] = (typeMap[p.user_type || 'private'] || 0) + 1;
    });
    return {
      byLang: Object.entries(langMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      byType: Object.entries(typeMap).map(([name, value]) => ({ name, value })),
      verified: profiles.filter(p => p.is_verified_seller).length,
      phoneVerified: profiles.filter(p => p.phone_verified).length,
      banned: profiles.filter(p => p.is_banned).length,
      referred: profiles.filter(p => p.referred_by).length,
    };
  }, [profiles]);

  // ── Listings breakdown ──
  const listingBreakdown = useMemo(() => {
    const catMap: Record<string, number> = {};
    const locMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {};
    listings.forEach(l => {
      catMap[l.category] = (catMap[l.category] || 0) + 1;
      locMap[l.location_area] = (locMap[l.location_area] || 0) + 1;
      statusMap[l.status] = (statusMap[l.status] || 0) + 1;
    });
    return {
      byCategory: Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
      byLocation: Object.entries(locMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10),
      byStatus: Object.entries(statusMap).map(([name, value]) => ({ name, value })),
    };
  }, [listings]);

  // ── Device / Platform ──
  const deviceBreakdown = useMemo(() => {
    const osMap: Record<string, number> = {};
    const browserMap: Record<string, number> = {};
    devices.forEach(d => {
      osMap[d.os || 'Inconnu'] = (osMap[d.os || 'Inconnu'] || 0) + 1;
      browserMap[d.browser || 'Inconnu'] = (browserMap[d.browser || 'Inconnu'] || 0) + 1;
    });
    return {
      byOS: Object.entries(osMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      byBrowser: Object.entries(browserMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    };
  }, [devices]);

  // ── Subscription breakdown ──
  const subBreakdown = useMemo(() => {
    const planMap: Record<string, number> = {};
    proSubs.forEach(s => {
      planMap[s.plan_type] = (planMap[s.plan_type] || 0) + 1;
    });
    return Object.entries(planMap).map(([name, value]) => ({ name, value }));
  }, [proSubs]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" /> Statistiques complètes
        </h2>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* ── Primary KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard icon={Users} label="Utilisateurs total" value={kpis.totalUsers} />
        <KPICard icon={UserPlus} label="Inscriptions (7j)" value={kpis.signups7d} trend={kpis.signupGrowth} subtitle="vs semaine précédente" />
        <KPICard icon={DollarSign} label="Revenus (30j)" value={`${(kpis.revenue30d / 1000).toFixed(0)}k`} variant="success" subtitle="IDR" />
        <KPICard icon={ShoppingCart} label="Deals confirmés (7j)" value={kpis.deals7d} variant="success" />
        <KPICard icon={Star} label="Abonnés Pro actifs" value={kpis.activeSubs} variant="success" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={Eye} label="Vues totales" value={kpis.totalViews.toLocaleString()} />
        <KPICard icon={Calendar} label="Annonces actives" value={kpis.activeListings} />
        <KPICard icon={MessageCircle} label="Deals total" value={kpis.totalDeals} />
        <KPICard icon={DollarSign} label="Revenus total" value={`${(kpis.totalRevenue / 1000000).toFixed(1)}M`} variant="success" subtitle="IDR" />
      </div>

      {/* ── Time Series Charts ── */}
      <Tabs defaultValue="signups" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="signups">Inscriptions</TabsTrigger>
          <TabsTrigger value="listings">Annonces</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="revenue">Revenus</TabsTrigger>
        </TabsList>

        <TabsContent value="signups">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Inscriptions {period === 'day' ? '(30 jours)' : period === 'week' ? '(3 mois)' : period === 'month' ? '(12 mois)' : '(toutes)'}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={signupSeries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name="Inscriptions" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listings">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Annonces créées</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={listingSeries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Annonces" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deals">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Deals conclus</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dealSeries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-2, 150 60% 50%))" strokeWidth={2} dot={false} name="Deals" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Revenus (k IDR)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueSeries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}k IDR`, 'Revenus']} />
                    <Bar dataKey="amount" fill="hsl(var(--chart-2, 150 60% 50%))" radius={[4, 4, 0, 0]} name="Revenus" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Breakdowns ── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* User language distribution */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4" /> Langue préférée</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={userBreakdown.byLang} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {userBreakdown.byLang.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User type */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Répartition utilisateurs</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 pt-2">
              {[
                { label: 'Particuliers', count: userBreakdown.byType.find(t => t.name === 'private')?.value || 0, color: 'bg-primary' },
                { label: 'Business', count: userBreakdown.byType.find(t => t.name === 'business')?.value || 0, color: 'bg-emerald-500' },
                { label: 'Vendeurs vérifiés', count: userBreakdown.verified, color: 'bg-blue-500' },
                { label: 'Téléphone vérifié', count: userBreakdown.phoneVerified, color: 'bg-amber-500' },
                { label: 'Parrainés', count: userBreakdown.referred, color: 'bg-purple-500' },
                { label: 'Bannis', count: userBreakdown.banned, color: 'bg-destructive' },
              ].map(item => {
                const total = kpis.totalUsers || 1;
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{item.label}</span>
                      <span className="font-medium">{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${Math.max(pct, 1)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top catégories</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={listingBreakdown.byCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} className="fill-muted-foreground" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Annonces" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Locations */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top localisations</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={listingBreakdown.byLocation} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} className="fill-muted-foreground" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="hsl(var(--chart-2, 150 60% 50%))" radius={[0, 4, 4, 0]} name="Annonces" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Platform / OS */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Smartphone className="h-4 w-4" /> Plateformes (OS)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deviceBreakdown.byOS} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {deviceBreakdown.byOS.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Browsers */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Monitor className="h-4 w-4" /> Navigateurs</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deviceBreakdown.byBrowser} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {deviceBreakdown.byBrowser.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions & Listings status */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Abonnements par plan</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={subBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`} fontSize={11}>
                    {subBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Statut des annonces</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {listingBreakdown.byStatus.map(item => (
                <div key={item.name} className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs text-muted-foreground capitalize">{item.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
