import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (id.includes('@livekit') || id.includes('livekit-client')) {
            return 'livekit';
          }

          if (
            id.includes('jspdf') ||
            id.includes('html2canvas') ||
            id.includes('dompurify')
          ) {
            return 'pdf-tools';
          }

          if (
            id.includes('react-router-dom') ||
            id.includes('react-dom') ||
            id.includes('/react/')
          ) {
            return 'react-core';
          }

          return 'vendor';
        },
      },
    },
  },
})
