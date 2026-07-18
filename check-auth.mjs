import pg from "pg";
const { Pool } = pg;
const poolLocal = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:55322/postgres' });
const poolCloud = new Pool({ connectionString: 'postgresql://postgres:FisioFormeDB2026%21@db.sbpcfzlfhueviykyrevv.supabase.co:5432/postgres', ssl: { rejectUnauthorized: false } });

async function main() {
  try {
    const resL = await poolLocal.query("select email from auth.users");
    console.log("Local auth.users:", resL.rows);
    const resC = await poolCloud.query("select email from auth.users");
    console.log("Cloud auth.users:", resC.rows);
  } catch(e) {
    console.error(e);
  } finally {
    poolLocal.end();
    poolCloud.end();
  }
}
main();
