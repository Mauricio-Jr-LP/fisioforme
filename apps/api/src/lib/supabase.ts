import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

// Cliente com SERVICE ROLE — usado no backend para verificar tokens de auth
// e gerar URLs assinadas do Storage. Bypassa RLS.
export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Gera uma URL assinada (temporária) para um arquivo do bucket. */
export async function signedUrl(filePath: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(env.storageBucket)
    .createSignedUrl(filePath, expiresIn);
  if (error) {
    console.warn('[storage] falha ao assinar URL', filePath, error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}
