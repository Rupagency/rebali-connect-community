import { useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Native push notifications for iOS/Android via Capacitor.
 * Registers the device token with Supabase for server-side push delivery.
 *
 * On web, this hook is a no-op — use usePushNotifications (Web Push / VAPID) instead.
 */
export function useNativePushNotifications() {
  const { user } = useAuth();
  const registeredRef = useRef(false);

  const register = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !user || registeredRef.current) return;

    try {
      const platform = Capacitor.getPlatform(); // 'ios' or 'android'

      // Attach listeners BEFORE register() to avoid missing a fast token callback
      await PushNotifications.addListener('registration', async (token) => {
        console.log('[NativePush] Token:', token.value);
        registeredRef.current = true;

        const endpoint = `native://${platform}/${token.value}`;

        const { error } = await supabase.from('push_subscriptions').upsert(
          {
            user_id: user.id,
            endpoint,
            p256dh: token.value,
            auth: platform,
          } as any,
          { onConflict: 'user_id,endpoint' }
        );

        if (error) {
          console.error('[NativePush] Failed to store token:', error);
        }
      });

      await PushNotifications.addListener('registrationError', (error) => {
        console.error('[NativePush] Registration error:', error);
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[NativePush] Received:', notification);
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('[NativePush] Action:', action);
        const data = action.notification.data;

        if (data?.type === 'message' && data?.conversation_id) {
          window.location.hash = '';
          window.location.href = `/messages?conv=${data.conversation_id}`;
        } else if (data?.type === 'deal' && data?.conversation_id) {
          window.location.href = `/messages?conv=${data.conversation_id}`;
        } else if (data?.type === 'listing' && data?.listing_id) {
          window.location.href = `/listing/${data.listing_id}`;
        } else if (data?.type === 'search_alert' && data?.listing_id) {
          window.location.href = `/listing/${data.listing_id}`;
        }
      });

      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') {
        console.log('[NativePush] Permission denied');
        return;
      }

      await PushNotifications.register();
    } catch (err) {
      console.error('[NativePush] Setup error:', err);
    }
  }, [user]);

  useEffect(() => {
    register();

    return () => {
      if (Capacitor.isNativePlatform()) {
        registeredRef.current = false;
        PushNotifications.removeAllListeners();
      }
    };
  }, [register]);
}
