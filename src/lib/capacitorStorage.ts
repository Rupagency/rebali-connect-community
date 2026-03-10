/**
 * Supabase auth storage adapter using Capacitor Preferences (native SharedPreferences).
 * Persists sessions across WebView cache clears / app updates on Android & iOS.
 * Falls back to localStorage on web.
 */
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const isNative = Capacitor.isNativePlatform();

// In-memory cache so synchronous getItem() works after initial hydration
const cache = new Map<string, string>();

/** Hydrate the in-memory cache from native storage on startup.
 *  Also migrates any existing session from localStorage → Preferences (one-time). */
export async function hydrateCache(): Promise<void> {
  if (!isNative) return;

  // One-time migration: copy auth keys from localStorage to Preferences
  const migrated = localStorage.getItem('__sb_prefs_migrated');
  if (!migrated) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-')) {
        const value = localStorage.getItem(key);
        if (value) {
          await Preferences.set({ key, value });
        }
      }
    }
    localStorage.setItem('__sb_prefs_migrated', '1');
  }

  // Hydrate in-memory cache from Preferences
  const { keys } = await Preferences.keys();
  const sbKeys = keys.filter(k => k.startsWith('sb-'));
  await Promise.all(
    sbKeys.map(async (key) => {
      const { value } = await Preferences.get({ key });
      if (value !== null) cache.set(key, value);
    })
  );
}

/**
 * Storage adapter compatible with Supabase's SupportedStorage interface.
 * On native: reads from in-memory cache (hydrated at startup), writes to Preferences.
 * On web: delegates to localStorage.
 */
export const capacitorStorage = {
  getItem(key: string): string | null {
    if (!isNative) return localStorage.getItem(key);
    return cache.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    if (!isNative) {
      localStorage.setItem(key, value);
      return;
    }
    cache.set(key, value);
    Preferences.set({ key, value }).catch(console.error);
  },

  removeItem(key: string): void {
    if (!isNative) {
      localStorage.removeItem(key);
      return;
    }
    cache.delete(key);
    Preferences.remove({ key }).catch(console.error);
  },
};
