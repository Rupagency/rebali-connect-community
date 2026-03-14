import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
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

const tooltipStyle = {
  backgroundColor: 'hsl(var(--background))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

export default function AdminStats() {
  const { t } = useLanguage();
  const { profiles, listings, conversations, invoices, proSubs, devices, events, isLoading } = useAdminStatsData();
  const [period, setPeriod] = useState<Period>('day');

  const daysForPeriod = period === 'day' ? 30 : period === 'week' ? 90 : period === 'month' ? 365 : 1095;

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

  const deviceBreakdown = useMemo(() => {
    const osMap: Record<string, number> = {};
    const browserMap: Record<string, number> = {};
    devices.forEach(d => {
      osMap[d.os || '?'] = (osMap[d.os || '?'] || 0) + 1;
      browserMap[d.browser || '?'] = (browserMap[d.browser || '?'] || 0) + 1;
    });
    return {
      byOS: Object.entries(osMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      byBrowser: Object.entries(browserMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    };
  }, [devices]);

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

  const periodLabel = period === 'day' ? t('adminPage.period30d') : period === 'week' ? t('adminPage.period3m') : period === 'month' ? t('adminPage.period12m') : t('adminPage.periodAll');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5" /> {t('adminPage.fullStats')}
        </h2>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">{t('adminPage.byDay')}</SelectItem>
            <SelectItem value="week">{t('adminPage.byWeek')}</SelectItem>
            <SelectItem value="month">{t('adminPage.byMonth')}</SelectItem>
            <SelectItem value="year">{t('adminPage.byYear')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard icon={Users} label={t('adminPage.usersTotal')} value={kpis.totalUsers} />
        <KPICard icon={UserPlus} label={t('adminPage.signups7d')} value={kpis.signups7d} trend={kpis.signupGrowth} subtitle={t('adminPage.vsPrevWeek')} />
        <KPICard icon={DollarSign} label={t('adminPage.revenue30d')} value={`${(kpis.revenue30d / 1000).toFixed(0)}k`} variant="success" subtitle="IDR" />
        <KPICard icon={ShoppingCart} label={t('adminPage.dealsConfirmed7d')} value={kpis.deals7d} variant="success" />
        <KPICard icon={Star} label={t('adminPage.activeProSubs')} value={kpis.activeSubs} variant="success" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={Eye} label={t('adminPage.totalViews')} value={kpis.totalViews.toLocaleString()} />
        <KPICard icon={Calendar} label={t('adminPage.activeLabel')} value={kpis.activeListings} />
        <KPICard icon={MessageCircle} label={t('adminPage.totalDeals')} value={kpis.totalDeals} />
        <KPICard icon={DollarSign} label={t('adminPage.totalRevenue')} value={`${(kpis.totalRevenue / 1000000).toFixed(1)}M`} variant="success" subtitle="IDR" />
      </div>

      <Tabs defaultValue="signups" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="signups">{t('adminPage.signupsTab')}</TabsTrigger>
          <TabsTrigger value="listings">{t('adminPage.listingsTab')}</TabsTrigger>
          <TabsTrigger value="deals">{t('adminPage.dealsTab')}</TabsTrigger>
          <TabsTrigger value="revenue">{t('adminPage.revenueTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="signups">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t('adminPage.signupsTab')} {periodLabel}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={signupSeries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name={t('adminPage.signupsTab')} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listings">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t('adminPage.listingsCreated7d')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={listingSeries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name={t('adminPage.listingsTab')} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deals">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t('adminPage.dealsCompleted')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dealSeries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-2, 150 60% 50%))" strokeWidth={2} dot={false} name={t('adminPage.dealsTab')} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t('adminPage.revenueKIdr')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueSeries}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}k IDR`, t('adminPage.revenueTab')]} />
                    <Bar dataKey="amount" fill="hsl(var(--chart-2, 150 60% 50%))" radius={[4, 4, 0, 0]} name={t('adminPage.revenueTab')} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4" /> {t('adminPage.preferredLang')}</CardTitle></CardHeader>
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

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> {t('adminPage.userBreakdown')}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 pt-2">
              {[
                { label: t('adminPage.privateUsers'), count: userBreakdown.byType.find(t => t.name === 'private')?.value || 0, color: 'bg-primary' },
                { label: t('adminPage.businessPro'), count: userBreakdown.byType.find(t => t.name === 'business')?.value || 0, color: 'bg-emerald-500' },
                { label: t('adminPage.verifiedSellers'), count: userBreakdown.verified, color: 'bg-blue-500' },
                { label: t('adminPage.phoneVerifiedLabel'), count: userBreakdown.phoneVerified, color: 'bg-amber-500' },
                { label: t('adminPage.referred'), count: userBreakdown.referred, color: 'bg-purple-500' },
                { label: t('admin.banned'), count: userBreakdown.banned, color: 'bg-destructive' },
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

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t('adminPage.topCategories')}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={listingBreakdown.byCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} className="fill-muted-foreground" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name={t('adminPage.listingsTab')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t('adminPage.topLocations')}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={listingBreakdown.byLocation} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} className="fill-muted-foreground" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="hsl(var(--chart-2, 150 60% 50%))" radius={[0, 4, 4, 0]} name={t('adminPage.listingsTab')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Smartphone className="h-4 w-4" /> {t('adminPage.platformsOS')}</CardTitle></CardHeader>
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

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Monitor className="h-4 w-4" /> {t('adminPage.browsers')}</CardTitle></CardHeader>
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

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t('adminPage.subsByPlan')}</CardTitle></CardHeader>
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
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t('adminPage.listingStatuses')}</CardTitle></CardHeader>
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
