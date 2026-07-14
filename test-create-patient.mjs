import { createClient } from "@supabase/supabase-js";
const supabaseAdmin = createClient(
  "https://sbpcfzlfhueviykyrevv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicGNmemxmaHVldml5a3lyZXZ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzk3ODg4NSwiZXhwIjoyMDk5NTU0ODg1fQ.x_pZnyVeIGh6DyCvAMIWJpblbWF62PDOPXJ114dUHz8"
);

async function run() {
  const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
    email: "cliente@fisioforme.local",
    password: "cliente123",
    email_confirm: true,
  });
  if (error) { console.log("Auth Error:", error); return; }
  console.log("User created:", user.user.id);
  
  // Triggers normally create profile, but we need to update it
  const { error: profileErr } = await supabaseAdmin.from("profiles").update({
    full_name: "Cliente Teste",
    role: "patient"
  }).eq("id", user.user.id);
  
  if (profileErr) console.log("Profile Error:", profileErr);

  // Insert patient record
  const { error: patientErr } = await supabaseAdmin.from("patients").insert({
    profile_id: user.user.id,
    full_name: "Cliente Teste",
    email: "cliente@fisioforme.local",
    phone: "11999999999",
    birth_date: "1990-01-01"
  });
  
  if (patientErr) console.log("Patient Error:", patientErr);
  else console.log("Patient record created successfully!");
}
run();
