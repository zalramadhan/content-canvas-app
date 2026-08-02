import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Base path for GitHub Pages project site (https://zalramadhan.github.io/content-canvas-app/)
  base: '/content-canvas-app/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg'],
      manifest: {
        name: 'ContentCanvas - Social Media Planner',
        short_name: 'ContentCanvas',
        description: 'Social Media Content Planning App',
        theme_color: '#7c3aed',
        background_color: '#0f0f11',
        display: 'standalone',
        orientation: 'portrait',
        // Relative paths so the PWA works under the GitHub Pages subpath
        scope: './',
        start_url: './',
        icons: [
          {
            src: './pwa-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/img\.youtube\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'youtube-thumbnails',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 }
            }
          }
        ]
      }
    })
  ],
})
