import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Оплата — учёт платежей",
        short_name: "Оплата",
        description: "Учёт оплат и контроль задолженностей для детских центров",
        theme_color: "#0b0e1a",
        background_color: "#0b0e1a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
        // SPA-роутинг: любая офлайн-навигация (кроме запросов к API) отдаёт закэшированный
        // index.html, дальше маршрутизацией занимается React Router на клиенте.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        // Без этого новый service worker "зависает" в состоянии waiting, пока все вкладки
        // со старой версией не закроются вручную — из-за этого обновления не доходили
        // до пользователей по несколько дней. skipWaiting+clientsClaim активируют новую
        // версию сразу же, автообновление (registerType: autoUpdate) перезагружает вкладку.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
