import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/routes': 'http://localhost:3001',
      '/compliance': 'http://localhost:3001',
      '/banking': 'http://localhost:3001',
      '/pools': 'http://localhost:3001',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/shared/test-setup.ts',
  },
});
