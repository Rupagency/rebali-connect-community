import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

export function useAdminLog() {
  const { user } = useAuth();

  const logAction = useCallback(async (
    action: string,
    targetType: string,
    targetId?: string,
    details?: Record<string, any>
  ) => {
    if (!user) return;
    try {
      await supabase.from('admin_logs' as any).insert({
        admin_id: user.id,
        action,
        target_type: targetType,
        target_id: targetId || null,
        details: details || {},
      });
    } catch (err) {
      console.error('[AdminLog] Failed to log action:', err);
    }
  }, [user]);

  return { logAction };
}
