import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/trip-recommendator/',
  publicDir: 'public',
  root: '.',
  server: {
    host: true,
    port: 3000,
    watch: {
      usePolling: true,
    },
  },
  preview: {
    host: true,
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
