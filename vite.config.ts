import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = dirname(fileURLToPath(import.meta.url))

// jhpark0912.github.io is a GitHub user site, so it is served from the domain
// root — no repository sub-path in the base URL.
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    target: 'es2020',
    rollupOptions: {
      // Two pages: the invitation itself and a private admin console at
      // /admin.html for the guestbook and the RSVP responses.
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
      output: {
        manualChunks: {
          // Firebase is only needed once a guest opens the guestbook or RSVP,
          // so keep it out of the initial bundle.
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
        },
      },
    },
  },
})
