import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { App } from '@capacitor/app';

export const isNativePlatform = Capacitor.isNativePlatform();

let keyboardListenersAttached = false;
let focusScrollListenerAttached = false;

const isTextEntryElement = (el: Element | null): el is HTMLElement => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
};

const scrollFocusedFieldIntoView = (el: Element | null) => {
  if (!isTextEntryElement(el)) return;
  window.setTimeout(() => {
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  }, 140);
};

export async function initCapacitor() {
  if (!isNativePlatform) return;

  // Tag body with platform class for CSS targeting
  document.body.classList.add('capacitor-native');
  document.body.classList.add(`capacitor-${Capacitor.getPlatform()}`);

  // Detect Android nav bar height and set CSS variable
  if (Capacitor.getPlatform() === 'android') {
    const navBarHeight = window.screen.height - window.innerHeight - (window.screen.height - window.outerHeight);
    document.documentElement.style.setProperty('--android-nav-height', `${Math.max(navBarHeight, 48)}px`);
  }

  // Status bar styling
  await StatusBar.setStyle({ style: Style.Dark });
  await StatusBar.setOverlaysWebView({ overlay: true });

  // Hide splash screen after app is ready
  await SplashScreen.hide();

  // Keyboard behavior on iOS
  if (Capacitor.getPlatform() === 'ios') {
    Keyboard.setAccessoryBarVisible({ isVisible: true });
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
    await Keyboard.setScroll({ isDisabled: false });
  }

  if (!keyboardListenersAttached) {
    await Keyboard.addListener('keyboardDidShow', ({ keyboardHeight }) => {
      document.body.classList.add('keyboard-open');
      document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
      scrollFocusedFieldIntoView(document.activeElement);
    });

    await Keyboard.addListener('keyboardDidHide', () => {
      document.body.classList.remove('keyboard-open');
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    });

    keyboardListenersAttached = true;
  }

  if (!focusScrollListenerAttached) {
    document.addEventListener('focusin', (event) => {
      if (!document.body.classList.contains('keyboard-open')) return;
      scrollFocusedFieldIntoView(event.target as Element | null);
    });
    focusScrollListenerAttached = true;
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
