import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/** Shared admin data queries — prevents duplicate fetching across sub-pages */
export function useAdminProfiles() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
    staleTime: 30_000,
  });
}

export function useAdminListings() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['admin-listings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, profiles:seller_id(display_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
    staleTime: 30_000,
  });
}

export function useAdminReports() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const { data } = await supabase
        .from('reports')
        .select('*, listings(id, title_original, seller_id, status), profiles:reporter_id(display_name)')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
    staleTime: 30_000,
  });
}

export function useAdminIdVerifications() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['admin-id-verifications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('id_verifications')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
    staleTime: 30_000,
  });
}

export function useAdminProSubscriptions() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['admin-pro-subscriptions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pro_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
    staleTime: 30_000,
  });
}

export function useAdminUserPoints() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['admin-user-points'],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('manage-points', {
        body: { action: 'admin_get_all_points' },
      });
      return data?.points || [];
    },
    enabled: isAdmin,
    staleTime: 60_000,
  });
}

export function useAdminUserAddons() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['admin-user-addons'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_addons')
        .select('*')
        .eq('active', true)
        .eq('addon_type', 'extra_listings');
      return data || [];
    },
    enabled: isAdmin,
    staleTime: 60_000,
  });
}

export function useAdminDevices() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['admin-devices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_devices')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
    staleTime: 60_000,
  });
}

export function useAdminBannedDevices() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['admin-banned-devices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('banned_devices')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: isAdmin,
    staleTime: 60_000,
  });
}

export function useAdminAnalyticsEvents() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['admin-analytics-events'],
    queryFn: async () => {
      const { data } = await supabase
        .from('analytics_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      return data || [];
    },
    enabled: isAdmin,
    staleTime: 60_000,
  });
}
