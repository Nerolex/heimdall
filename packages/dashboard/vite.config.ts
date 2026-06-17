import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
  },
  server: {
    proxy: {
      '/api': 'http://192.168.178.51:3000',
      '/assets': 'http://192.168.178.51:3000',
    },
  },
});
