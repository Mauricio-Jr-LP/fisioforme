import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Em desenvolvimento, carrega o .env da raiz do monorepo.
// Em produção (Render), as variáveis já estão no process.env — dotenv não é necessário.
if (process.env.NODE_ENV !== 'production') {
  const here = path.dirname(fileURLToPath(import.meta.url));
  dotenv.config({ path: path.resolve(here, '../../../../.env') });
  dotenv.config(); // fallback para .env local do app
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    const msg = `[env] Variável obrigatória ausente: ${name}`;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg); // falha rápida em produção
    }
    console.warn(msg);
    return '';
  }
  return v;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:5173',
  databaseUrl: required('DATABASE_URL'),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  storageBucket: process.env.STORAGE_BUCKET || 'attachments',
  clinicTz: process.env.CLINIC_TZ || 'America/Sao_Paulo',
};

export const isProd = env.nodeEnv === 'production';
