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

function escapeParam(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return "'" + val.toISOString() + "'";
  if (Array.isArray(val)) return "'" + JSON.stringify(val).replace(/'/g, "''") + "'";
  if (typeof val === 'object') return "'" + JSON.stringify(val).replace(/'/g, "''") + "'";
  return "'" + String(val).replace(/'/g, "''") + "'";
}

function formatQuery(text: string, params: any[]): string {
  let formatted = text;
  for (let i = params.length - 1; i >= 0; i--) {
    const val = escapeParam(params[i]);
    const regex = new RegExp(`\\$${i + 1}(?!\\d)`, 'g');
    formatted = formatted.replace(regex, val);
  }
  return formatted;
}

import { supabaseAdmin } from '../lib/supabase.js';

/** Query tipada de conveniência. */
export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  if (isProd) {
    const sql = params.length > 0 ? formatQuery(text, params) : text;
    // No Render não há suporte para IPv6 outbound (ENETUNREACH), e não conseguimos
    // usar o pooler IPv4. Portanto, enviamos a query formatada via REST API do Supabase!
    const { data, error } = await supabaseAdmin.rpc('execute_sql', { q: sql });
    if (error) {
      console.error('[db] falha ao executar query via rpc', error);
      throw error;
    }
    // A RPC retorna JSON. O driver pg retornaria res.rows.
    return (data as unknown as T[]) || [];
  }
  const res = await pool.query(text, params);
  return res.rows as T[];
}

/** Retorna a primeira linha ou null. */
export async function queryOne<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
