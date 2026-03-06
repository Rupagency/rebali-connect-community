import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useBlockedUsers() {
  const { user } = useAuth();

  const { data: blockedIds = [] } = useQuery({
    queryKey: ['blocked-users', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_blocks' as any)
        .select('blocked_id')
        .eq('blocker_id', user!.id);
      return (data || []).map((b: any) => b.blocked_id as string);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return blockedIds;
}

export function useBlockUser() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const blockUser = async (blockedId: string, reason?: string) => {
    if (!user) return;
    await supabase.from('user_blocks' as any).insert({
      blocker_id: user.id,
      blocked_id: blockedId,
      reason: reason || null,
    });
    queryClient.invalidateQueries({ queryKey: ['blocked-users', user.id] });
  };

  const unblockUser = async (blockedId: string) => {
    if (!user) return;
    await supabase
      .from('user_blocks' as any)
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId);
    queryClient.invalidateQueries({ queryKey: ['blocked-users', user.id] });
  };

  const isBlocked = (blockedIds: string[], userId: string) => blockedIds.includes(userId);

  return { blockUser, unblockUser, isBlocked };
}
