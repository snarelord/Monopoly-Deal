import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/database.types";

let client: SupabaseClient<Database> | undefined;

export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("The Supabase env vars are missing. Is .env.local set up and Supabase running?");
  if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url)) throw new Error(`Tests only use the local database, not ${url}`);
  client ??= createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
