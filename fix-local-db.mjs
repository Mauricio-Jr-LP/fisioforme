import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:55322/postgres' });

async function main() {
  try {
    const res = await pool.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'subadmin'");
    console.log("Success");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
main();
