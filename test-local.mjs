import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:55322/postgres' });

async function main() {
  try {
    const res = await pool.query("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'user_role'");
    console.log(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
main();
