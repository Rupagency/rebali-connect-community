import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';

export const isNativePlatform = Capacitor.isNativePlatform();

export async function initCapacitor() {
  if (!isNativePlatform) return;

  // Tag body with platform class for CSS targeting
  document.body.classList.add('capacitor-native');
  document.body.classList.add(`capacitor-${Capacitor.getPlatform()}`);

  // Status bar styling
  await StatusBar.setStyle({ style: Style.Dark });
  await StatusBar.setOverlaysWebView({ overlay: true });
  if (Capacitor.getPlatform() === 'android') {
    await StatusBar.setBackgroundColor({ color: '#00000000' });
  }

  // Hide splash screen after app is ready
  await SplashScreen.hide();

  // Keyboard behavior on iOS
  if (Capacitor.getPlatform() === 'ios') {
    Keyboard.setAccessoryBarVisible({ isVisible: true });
  }

  // Handle back button on Android
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });
}
