import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rebali.app',
  appName: 'Re-Bali',
  webDir: 'dist',
  server: {
    url: 'https://1a8d380a-ee50-4c52-a5d9-94d14ab3077f.lovableproject.com?forceHideBadge=true',
    cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f766e',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f766e',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
