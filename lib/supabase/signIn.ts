import { createBrowserSupabase } from './browser';

export async function ensureSignedIn() {
  const supabase = createBrowserSupabase();
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}