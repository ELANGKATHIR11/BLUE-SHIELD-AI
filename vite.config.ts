import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'vendor';
          }
          if (id.includes('node_modules/leaflet/') || id.includes('node_modules/react-leaflet/')) {
            return 'leaflet';
          }
          if (id.includes('node_modules/firebase/')) {
            return 'firebase';
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'ui';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
