import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/counselling/ayurveda/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8082,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 8082,
    strictPort: true,
  }
})
