import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vite's own dynamic-import runtime (__vitePreload + the legacy
          // modulepreload polyfill) is a virtual, non-node_modules module
          // that every React.lazy() route and every dynamic import() needs.
          // Left unassigned, Rollup's default chunking fused it into
          // whichever large async chunk it met first in the graph (here:
          // pdf-tools) — which then forced EVERY route, including the entry
          // chunk, to eagerly import all 563kB of pdf-tools just to get a
          // ~1kB helper. Giving it its own tiny explicit chunk stops that.
          if (id.includes('vite/preload-helper') || id.includes('vite/modulepreload-polyfill')) {
            return 'vite-runtime';
          }

          if (!id.includes('node_modules')) return;

          if (id.includes('@livekit') || id.includes('livekit-client')) return 'livekit';

          // socket.io-client is only ever invoked inside SocketContext's
          // lazy useState initializer (a function body), never at module
          // top-level, so — unlike the earlier attempt to split React out
          // (reverted in 7d1f329 because vendor code called
          // React.createContext at its own top level before the react
          // chunk had run) — there's no eager cross-chunk execution-order
          // hazard here. Splitting it only buys independent caching.
          if (id.includes('socket.io-client') || id.includes('engine.io-client')) return 'socket';

          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify')) return 'pdf-tools';

          // face-api.js (and the TensorFlow.js it bundles) is only ever
          // reached via a dynamic import() inside useFocusMonitor, when a
          // user opts into AI focus monitoring in a room. Keeping it out of
          // 'vendor' stops it from being forced into the eagerly-loaded
          // chunk every page — including login — has to download.
          if (id.includes('face-api.js') || id.includes('@tensorflow')) return 'face-detection';

          return 'vendor';
        },
      },
    },
  },
})
