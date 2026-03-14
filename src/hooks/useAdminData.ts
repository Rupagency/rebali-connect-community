import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Shared admin data queries.
 * Queries are enabled only when user session is available to prevent
 * RLS-blocked empty results from being cached.
 */

function useSessionReady() {
  const { session, isAdmin } = useAuth();
  return !!session && isAdmin;
}

export function useAdminProfiles() {
  const ready = useSessionReady();
  return useQuery({
    queryKey: ['admin-profiles'],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) console.error('[Admin] profiles error:', error.message);
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useAdminListings() {
  const ready = useSessionReady();
  return useQuery({
    queryKey: ['admin-listings'],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) console.error('[Admin] listings error:', error.message);
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useAdminReports() {
  const ready = useSessionReady();
  return useQuery({
    queryKey: ['admin-reports'],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) console.error('[Admin] reports error:', error.message);
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useAdminIdVerifications() {
  const ready = useSessionReady();
  return useQuery({
    queryKey: ['admin-id-verifications'],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('id_verifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) console.error('[Admin] id_verifications error:', error.message);
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useAdminProSubscriptions() {
  const ready = useSessionReady();
  return useQuery({
    queryKey: ['admin-pro-subscriptions'],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pro_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) console.error('[Admin] pro_subscriptions error:', error.message);
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useAdminUserPoints() {
  const ready = useSessionReady();
  return useQuery({
    queryKey: ['admin-user-points'],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('manage-points', {
        body: { action: 'admin_get_all_points' },
      });
      return data?.points || [];
    },
    staleTime: 60_000,
  });
}

export function useAdminUserAddons() {
  const ready = useSessionReady();
  return useQuery({
    queryKey: ['admin-user-addons'],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_addons')
        .select('*')
        .eq('active', true)
        .eq('addon_type', 'extra_listings');
      if (error) console.error('[Admin] user_addons error:', error.message);
      return data || [];
    },
    staleTime: 60_000,
  });
}

export function useAdminDevices() {
  const ready = useSessionReady();
  return useQuery({
    queryKey: ['admin-devices'],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_devices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) console.error('[Admin] user_devices error:', error.message);
      return data || [];
    },
    staleTime: 60_000,
  });
}

export function useAdminBannedDevices() {
  const ready = useSessionReady();
  return useQuery({
    queryKey: ['admin-banned-devices'],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banned_devices')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) console.error('[Admin] banned_devices error:', error.message);
      return data || [];
    },
    staleTime: 60_000,
  });
}

export function useAdminAnalyticsEvents() {
  const ready = useSessionReady();
  return useQuery({
    queryKey: ['admin-analytics-events'],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) console.error('[Admin] analytics_events error:', error.message);
      return data || [];
    },
    staleTime: 60_000,
  });
}

export function useAdminLogs() {
  const ready = useSessionReady();
  return useQuery({
    queryKey: ['admin-logs'],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) console.error('[Admin] admin_logs error:', error.message);
      return data || [];
    },
    staleTime: 15_000,
  });
}
