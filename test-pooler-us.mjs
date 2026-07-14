import pg from 'pg';
const { Pool } = pg;
const dbUrl = 'postgresql://postgres.sbpcfzlfhueviykyrevv:FisioFormeDB2026%21@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false }, connect_timeout: 5000 });

async function run() {
  try {
    const res = await pool.query('select 1 as ok');
    console.log('OK:', res.rows);
  } catch (e) {
    console.log('ERR:', e.message);
  } finally {
    pool.end();
  }
}
run();
