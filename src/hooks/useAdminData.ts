import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Shared admin data queries.
 * These hooks are ONLY used inside AdminLayout children,
 * which already gates on isAdmin — no need for `enabled: isAdmin` here.
 * Removing it fixes the race condition where isAdmin is false during first render.
 */

export function useAdminProfiles() {
  return useQuery({
    queryKey: ['admin-profiles'],
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
  return useQuery({
    queryKey: ['admin-listings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*, profiles:seller_id(display_name)')
        .order('created_at', { ascending: false });
      if (error) console.error('[Admin] listings error:', error.message);
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useAdminReports() {
  return useQuery({
    queryKey: ['admin-reports'],
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
  return useQuery({
    queryKey: ['admin-id-verifications'],
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
  return useQuery({
    queryKey: ['admin-pro-subscriptions'],
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
  return useQuery({
    queryKey: ['admin-user-points'],
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
  return useQuery({
    queryKey: ['admin-user-addons'],
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
  return useQuery({
    queryKey: ['admin-devices'],
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
  return useQuery({
    queryKey: ['admin-banned-devices'],
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
  return useQuery({
    queryKey: ['admin-analytics-events'],
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
  return useQuery({
    queryKey: ['admin-logs'],
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
