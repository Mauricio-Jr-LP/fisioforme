import pg from "pg";
const { Pool } = pg;
const dbUrl1 = "postgresql://postgres:FisioFormeDB2026%21@db.sbpcfzlfhueviykyrevv.supabase.co:5432/postgres";
const pool = new Pool({ connectionString: dbUrl1, ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    console.log('Adding subadmin to user_role enum...');
    await pool.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'subadmin';");
    console.log('Success!');
  } catch (e) {
    console.error('Failed:', e.message);
  } finally {
    pool.end();
  }
}
main();
