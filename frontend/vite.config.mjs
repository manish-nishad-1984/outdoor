import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Split rarely-changing libraries into their own long-cacheable chunks so an app
        // update doesn't force users to re-download React or the grid/icon libraries.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          grid: ['@tanstack/react-table'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
});
