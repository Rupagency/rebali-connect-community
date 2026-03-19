/* Re-Bali entry point */
import { createRoot } from "react-dom/client";
import AppRoot from "./App.tsx";
import "./index.css";
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { initCapacitor, isNativePlatform } from "./capacitor";
import { hydrateCache } from "./lib/capacitorStorage";
import { supabase } from "./integrations/supabase/client";
import { isInAppBrowser } from "./lib/openExternal";

// Capture in-app browser flag IMMEDIATELY before SPA navigation loses the query param
isInAppBrowser();

// Global error handlers to prevent white screens
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
});

// Initialize native plugins when running on iOS/Android
try {
  initCapacitor();
} catch (e) {
  console.error('Capacitor init error:', e);
}

async function restoreAuthSessionFromUrl(url: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(url);
    const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
    const accessToken = hashParams.get('access_token') ?? parsedUrl.searchParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') ?? parsedUrl.searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      return true;
    }

    const code = parsedUrl.searchParams.get('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('OAuth code exchange error:', error.message);
        return false;
      }
      return true;
    }
  } catch (e) {
    console.error('Deep-link auth restore error:', e);
  }

  return false;
}

if (isNativePlatform) {
  CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
    const restored = await restoreAuthSessionFromUrl(url);

    if (restored) {
      window.history.replaceState(null, '', '/');
      await Browser.close().catch(() => undefined);
    }
  });
}

// Restore session from deep-link hash tokens BEFORE rendering
async function restoreSessionAndRender() {
  // Hydrate native storage cache so Supabase can read persisted session
  await hydrateCache();

  const restored = await restoreAuthSessionFromUrl(window.location.href);
  if (restored) {
    // Clean the hash/query so tokens don't leak in the URL
    window.history.replaceState(null, '', window.location.pathname);
  }

  const root = document.getElementById("root");
  if (root) {
    createRoot(root).render(<AppRoot />);
  } else {
    console.error('Root element not found');
  }
}

restoreSessionAndRender();
