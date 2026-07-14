import pg from "pg";
const { Pool } = pg;
const dbUrl1 = "postgresql://postgres:FisioFormeDB2026%21@db.sbpcfzlfhueviykyrevv.supabase.co:5432/postgres";
const pool = new Pool({ connectionString: dbUrl1, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const createRpc = `
      CREATE OR REPLACE FUNCTION execute_sql(q text) RETURNS jsonb AS $$
      DECLARE
          res jsonb;
      BEGIN
          EXECUTE 'SELECT COALESCE(json_agg(row_to_json(t)), ''[]'') FROM (' || q || ') t' INTO res;
          RETURN res;
      EXCEPTION WHEN OTHERS THEN
          EXECUTE q;
          RETURN '[]'::jsonb;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    await pool.query(createRpc);
    console.log("RPC created!");

    const res1 = await pool.query("SELECT execute_sql('SELECT 1 as ok, ''test'' as str')");
    console.log("Select test:", res1.rows[0].execute_sql);

    const res2 = await pool.query("SELECT execute_sql('UPDATE profiles SET full_name = ''Administrador'' WHERE id = ''37cb0b78-da27-4f72-bc0b-978d7f258157'' ')");
    console.log("Update test:", res2.rows[0].execute_sql);

  } catch (e) {
    console.log("ERR:", e);
  } finally {
    pool.end();
  }
}
run();
