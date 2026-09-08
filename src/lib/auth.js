// Real Supabase email/password authentication -- PlayMenu.jsx's "Se
// connecter"/"S'inscrire" forms. Separate from lib/supabase.js's
// ensureAuthSession()/requireUserId(), which are about the *anonymous*
// session every repository silently falls back to; this file is only
// exercised by a user who deliberately chooses to create a real account
// instead of playing as a guest.
import { assertSupabaseConfigured } from "./supabase";

// Resolves to { session } on success. Supabase returns a session
// immediately when email confirmation is disabled on the project; when
// it's enabled, `session` comes back null and the caller should tell the
// player to check their inbox instead of navigating on.
export async function signUpWithPassword(email, password) {
  const client = assertSupabaseConfigured();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return { session: data?.session || null, user: data?.user || null };
}

export async function signInWithPassword(email, password) {
  const client = assertSupabaseConfigured();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { session: data?.session || null, user: data?.user || null };
}

export async function signOut() {
  const client = assertSupabaseConfigured();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}
