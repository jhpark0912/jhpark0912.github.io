import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// jhpark0912.github.io is a GitHub user site, so it is served from the domain
// root — no repository sub-path in the base URL.
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    target: 'es2020',
    rollupOptions: {
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
