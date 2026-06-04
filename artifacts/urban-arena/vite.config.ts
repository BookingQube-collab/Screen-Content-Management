import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

// Local/Replit UI: 24725 (see .replit-artifact). Vercel frontend build sets PORT=3000.
// VITE_DEV_PORT overrides; on Replit, PORT from the web service is used when set.
const rawPort =
  process.env.VITE_DEV_PORT ??
  (process.env.VERCEL
    ? process.env.PORT
    : process.env.REPL_ID !== undefined
      ? process.env.PORT
      : "24725");

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required for Vercel builds but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "images/*.png"],
      manifest: {
        name: "Urban Arena Display",
        short_name: "UA Display",
        description: "Urban Arena kiosk display system",
        theme_color: "#0c0820",
        background_color: "#0c0820",
        display: "fullscreen",
        orientation: "landscape",
        icons: [
          { src: "images/logo-urban-arena.png", sizes: "any", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        // Cache the app shell (JS, CSS, HTML) with CacheFirst
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // API: NetworkFirst — use live data when online, cached when not
        runtimeCaching: [
          {
            urlPattern: /\/api\/activities\/display/,
            handler: "NetworkFirst",
            options: {
              cacheName: "ua-activities-api",
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 7 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/settings/,
            handler: "NetworkFirst",
            options: {
              cacheName: "ua-settings-api",
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 7 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/admin\/locations/,
            handler: "NetworkFirst",
            options: {
              cacheName: "ua-locations-api",
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 7 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache uploaded media (images & videos) with CacheFirst
            urlPattern: /\/api\/uploads\/files\/.+/,
            handler: "CacheFirst",
            options: {
              cacheName: "ua-media",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
