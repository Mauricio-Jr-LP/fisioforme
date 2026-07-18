import pg from "pg";
const { Pool } = pg;
const poolLocal = new Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:55322/postgres' });
const poolCloud = new Pool({ connectionString: 'postgresql://postgres:FisioFormeDB2026%21@db.sbpcfzlfhueviykyrevv.supabase.co:5432/postgres', ssl: { rejectUnauthorized: false } });

async function runSql(pool) {
  await pool.query(`
    -- Atualiza pacientes existentes
    update patients set profile_id = (
      select id from profiles where lower(profiles.email) = lower(patients.email) limit 1
    ) where profile_id is null and email is not null and email != '';

    -- Atualiza a trigger handle_new_user para vincular automaticamente pacientes existentes
    CREATE OR REPLACE FUNCTION handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    begin
      insert into public.profiles (id, full_name, email, role)
      values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', ''),
        new.email,
        coalesce((new.raw_user_meta_data->>'role')::user_role, 'patient')
      )
      on conflict (id) do nothing;

      -- Vincular automaticamente qualquer prontuário (paciente) já existente que tenha o mesmo email
      update public.patients 
      set profile_id = new.id 
      where lower(email) = lower(new.email) and profile_id is null;

      return new;
    end $$;
  `);
}

async function main() {
  try {
    await runSql(poolLocal);
    console.log("Local OK");
    await runSql(poolCloud);
    console.log("Cloud OK");
  } catch(e) {
    console.error(e);
  } finally {
    poolLocal.end();
    poolCloud.end();
  }
}
main();
