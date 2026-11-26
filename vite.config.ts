import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base './' supaya berfungsi di GitHub Pages (subfolder) dan dalam APK Capacitor
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Staff Timetable',
        short_name: 'Timetable',
        description: 'Pengurusan jadual kerja staf mingguan',
        theme_color: '#5AAEE0',
        background_color: '#F6F0E2',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], maximumFileSizeToCacheInBytes: 6 * 1024 * 1024 }
    })
  ],
  build: { chunkSizeWarningLimit: 2000 },
  test: { environment: 'node' }
} as any);
