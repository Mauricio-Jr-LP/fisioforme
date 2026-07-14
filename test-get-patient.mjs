import pg from "pg";
const { Pool } = pg;
const dbUrl1 = "postgresql://postgres:FisioFormeDB2026%21@db.sbpcfzlfhueviykyrevv.supabase.co:5432/postgres";
const pool = new Pool({ connectionString: dbUrl1, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const res = await pool.query("SELECT execute_sql('SELECT id, full_name, role FROM profiles WHERE role = ''patient'' ')");
    console.log("Patients:", res.rows[0].execute_sql);
    const res2 = await pool.query("SELECT execute_sql('SELECT id, email FROM auth.users')");
    console.log("Users:", res2.rows[0].execute_sql);
  } catch (e) {
    console.log("ERR:", e);
  } finally {
    pool.end();
  }
}
run();
