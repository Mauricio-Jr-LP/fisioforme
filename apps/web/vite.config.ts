import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Em dev: lê VITE_* do .env na raiz do monorepo.
// Em prod (Render): o envDir não existe — usa process.env injetado pelo Render.
export default defineConfig(({ mode }) => {
  // Tenta carregar do monorepo root; em produção ficará vazio mas tudo bem
  const monorepoRoot = path.resolve(__dirname, '../../');
  const env = loadEnv(mode, monorepoRoot, '');

  return {
    plugins: [react()],
    envDir: monorepoRoot,
    resolve: {
      alias: {
        '@fisioforme/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Garante que variáveis do process.env (Render) sejam embutidas no bundle
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
      ),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
      ),
      'import.meta.env.VITE_API_URL': JSON.stringify(
        env.VITE_API_URL || process.env.VITE_API_URL || ''
      ),
      'import.meta.env.VITE_STORAGE_BUCKET': JSON.stringify(
        env.VITE_STORAGE_BUCKET || process.env.VITE_STORAGE_BUCKET || 'attachments'
      ),
    },
    server: {
      port: 5173,
      host: true,
    },
    preview: {
      port: 4173,
      host: true,
    },
  };
});
