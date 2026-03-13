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
      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') {
        console.log('[NativePush] Permission denied');
        return;
      }

      // Register with APNS/FCM
      await PushNotifications.register();

      // Listen for registration token
      PushNotifications.addListener('registration', async (token) => {
        console.log('[NativePush] Token:', token.value);
        registeredRef.current = true;

        // Store the native push token in push_subscriptions
        // We use "native://<platform>" as endpoint to distinguish from web push
        const platform = Capacitor.getPlatform(); // 'ios' or 'android'
        const endpoint = `native://${platform}/${token.value}`;

        await supabase.from('push_subscriptions').upsert(
          {
            user_id: user.id,
            endpoint,
            p256dh: token.value, // store FCM/APNS token here
            auth: platform, // store platform identifier
          } as any,
          { onConflict: 'user_id,endpoint' }
        );
      });

      // Handle registration errors
      PushNotifications.addListener('registrationError', (error) => {
        console.error('[NativePush] Registration error:', error);
      });

      // Handle received notifications when app is in foreground
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[NativePush] Received:', notification);
        // The notification is automatically shown by the OS when app is in background
        // For foreground, we could show an in-app toast
      });

      // Handle notification tap (opens the app)
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('[NativePush] Action:', action);
        const data = action.notification.data;
        
        // Navigate based on notification type
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
    } catch (err) {
      console.error('[NativePush] Setup error:', err);
    }
  }, [user]);

  useEffect(() => {
    register();

    return () => {
      if (Capacitor.isNativePlatform()) {
        PushNotifications.removeAllListeners();
      }
    };
  }, [register]);
}
