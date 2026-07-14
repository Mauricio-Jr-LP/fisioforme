import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  // Em dev: lê VITE_* do .env na raiz do monorepo.
  // Em prod: lê do apps/web/.env.production (commitado no repo).
  envDir: path.resolve(__dirname, '../../'),
  resolve: {
    alias: {
      '@fisioforme/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
});

