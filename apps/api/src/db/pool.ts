import pg from 'pg';
import { env, isProd } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  // Supabase exige SSL. rejectUnauthorized:false para o pooler gerenciado.
  ssl: env.databaseUrl.includes('supabase') || isProd ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('[db] erro inesperado no pool', err);
});

/** Query tipada de conveniência. */
export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

/** Retorna a primeira linha ou null. */
export async function queryOne<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
