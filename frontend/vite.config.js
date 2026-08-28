import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The frontend calls the API with relative paths so the built app works on any
// domain. In development the two run on different ports, so /api is proxied
// through to the backend. That keeps the requests same origin here too, which
// is why no CORS setup is needed while developing.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
