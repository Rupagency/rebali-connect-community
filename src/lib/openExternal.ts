import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/**
 * Opens an external URL in the in-app browser on native platforms,
 * or in a new tab on the web.
 */
export async function openExternal(url: string) {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
  } else {
    window.open(url, '_blank');
  }
}
