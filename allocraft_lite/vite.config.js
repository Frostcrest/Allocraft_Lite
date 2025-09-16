import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'esnext', // Support modern features including top-level await
    minify: 'esbuild',
  },
  server: {
    proxy: {
      '/wheels': 'http://localhost:8000',
    },
  },
});