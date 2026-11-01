import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true,
    host: true,
    proxy: { '/api': { target: 'http://127.0.0.1:5181', changeOrigin: false } },
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          konva: ['konva', 'react-konva'],
          charts: ['recharts'],
          motion: ['framer-motion'],
          export: ['jspdf', 'html-to-image'],
        },
      },
    },
  },
})
