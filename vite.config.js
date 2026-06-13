import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // Core React — cached long-term, downloaded once
          if (id.includes('react-dom') || id.includes('/react/')) return 'react';

          // LiveKit — large WebRTC SDK, loaded on every room page
          if (id.includes('@livekit') || id.includes('livekit-client')) return 'livekit';

          // AI/face models — huge, rarely changes
          if (id.includes('face-api') || id.includes('@tensorflow')) return 'ai';

          // PDF tools — only used when downloading notes
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify')) return 'pdf-tools';

          // Icons — large but stable
          if (id.includes('lucide-react')) return 'icons';

          return 'vendor';
        },
      },
    },
  },
})
