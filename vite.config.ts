import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt"],
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        importScripts: ["/sw-push.js"],
        runtimeCaching: [
          {
            // Cache Supabase REST API calls (listings, profiles, etc.)
            urlPattern: /^https:\/\/eddrshyqlrpxgvyxpjee\.supabase\.co\/rest\/v1\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache listing images from Supabase Storage
            urlPattern: /^https:\/\/eddrshyqlrpxgvyxpjee\.supabase\.co\/storage\/v1\/object\/public\/listings\//,
            handler: "CacheFirst",
            options: {
              cacheName: "listing-images-cache",
              expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache avatar images
            urlPattern: /^https:\/\/eddrshyqlrpxgvyxpjee\.supabase\.co\/storage\/v1\/object\/public\/avatars\//,
            handler: "CacheFirst",
            options: {
              cacheName: "avatar-images-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 14 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: "Re-Bali — Petites annonces Bali",
        short_name: "Re-Bali",
        description: "Bali's trusted platform connecting expats, locals, and businesses. Buy and sell second-hand — 100% free.",
        theme_color: "#0f766e",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
