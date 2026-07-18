import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:FisioFormeDB2026%21@db.sbpcfzlfhueviykyrevv.supabase.co:5432/postgres', ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    const res = await pool.query("update profiles set role = 'subadmin' where email = 'cliente@fisioforme.local'");
    console.log("Success");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
main();
