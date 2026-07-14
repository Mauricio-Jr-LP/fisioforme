import pg from 'pg';
const { Pool } = pg;
const dbUrl1 = 'postgresql://postgres:FisioFormeDB2026%21@db.sbpcfzlfhueviykyrevv.supabase.co:5432/postgres';
const pool = new Pool({ connectionString: dbUrl1, ssl: { rejectUnauthorized: false } });

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
