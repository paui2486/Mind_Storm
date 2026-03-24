import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    // Proxy API calls to the backend during development
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
