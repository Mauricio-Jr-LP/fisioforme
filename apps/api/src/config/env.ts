import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Carrega .env da raiz do monorepo (../../.. relativo a este arquivo)
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../../../.env') });
dotenv.config(); // fallback para .env local do app

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    // Não derruba o processo em dev, mas avisa alto.
    console.warn(`[env] Variável obrigatória ausente: ${name}`);
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
