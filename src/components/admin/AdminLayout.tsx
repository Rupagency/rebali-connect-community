import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Users,
  FileText,
  Fingerprint,
  MessageCircle,
  ScrollText,
  Shield,
  PieChart,
} from 'lucide-react';

const navItems = [
  { titleKey: 'adminLabels.dashboard', url: '/admin', icon: BarChart3, end: true },
  { titleKey: 'adminLabels.searchAnalytics', url: '/admin/search-analytics', icon: TrendingUp },
  { titleKey: 'adminLabels.reports', url: '/admin/reports', icon: AlertTriangle, badgeKey: 'reports' },
  { titleKey: 'adminLabels.users', url: '/admin/users', icon: Users },
  { titleKey: 'adminLabels.listings', url: '/admin/listings', icon: FileText },
  { titleKey: 'adminLabels.security', url: '/admin/security', icon: Fingerprint, badgeKey: 'verifications' },
  { titleKey: 'adminLabels.waRelay', url: '/admin/wa-relay', icon: MessageCircle },
  { titleKey: 'adminLabels.statistics', url: '/admin/stats', icon: PieChart },
  { titleKey: 'adminLabels.logs', url: '/admin/logs', icon: ScrollText },
];

function AdminSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { t } = useLanguage();
  const collapsed = state === 'collapsed';

  // Badge counts
  const { data: pendingReportsCount } = useQuery({
    queryKey: ['admin-pending-reports-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false);
      return count || 0;
    },
  });

  const { data: pendingVerificationsCount } = useQuery({
    queryKey: ['admin-pending-verifications-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('id_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending' as any);
      return count || 0;
    },
  });

  const badgeCounts: Record<string, number> = {
    reports: pendingReportsCount || 0,
    verifications: pendingVerificationsCount || 0,
  };

  const isActive = (url: string, end?: boolean) => {
    if (end) return location.pathname === url;
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon" className="border-r !sticky !top-16 !h-[calc(100vh-4rem)]">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {!collapsed && <span>{t('adminLabels.administration')}</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.end)}>
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className="flex items-center gap-2 hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <span className="flex-1 flex items-center justify-between">
                          <span>{t(item.titleKey)}</span>
                          {item.badgeKey && badgeCounts[item.badgeKey] > 0 && (
                            <Badge variant="destructive" className="text-[10px] h-5 min-w-5 flex items-center justify-center">
                              {badgeCounts[item.badgeKey]}
                            </Badge>
                          )}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/auth', { replace: true });
  }, [user, loading, navigate]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  if (!user) return null;

  if (!isAdmin) return (
    <div className="container mx-auto px-4 py-20 text-center">
      <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-lg text-muted-foreground">{t('adminLabels.accessDenied')}</p>
    </div>
  );

  return (
    <SidebarProvider>
      <div className="flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b px-4 gap-3 sticky top-16 z-10 bg-background">
            <SidebarTrigger />
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Shield className="h-5 w-5" /> {t('adminLabels.administration')}
            </h1>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
