import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative paths so the build works from any sub-path, e.g. GitHub Pages at /Web-task-manager/.
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Smart Task Manager',
        short_name: 'Tasks',
        description: 'Stay focused. Stay minimal.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f7f5f2',
        theme_color: '#1a1a1a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache everything the app needs so it opens with no network at all.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    coverage: { include: ['src/**/*.ts'], exclude: ['src/main.ts'] },
  },
});
