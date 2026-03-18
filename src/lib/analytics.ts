import { supabase } from '@/integrations/supabase/client';

type EventType = 'signup' | 'listing_created' | 'deal_closed' | 'message_sent' | 'search' | 'page_view' | 'npwp_verify_click';

export async function trackEvent(eventType: EventType, metadata: Record<string, any> = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('analytics_events' as any).insert({
      event_type: eventType,
      user_id: user.id,
      metadata,
    });
  } catch {
    // Silent fail — analytics should never break the app
  }
}
