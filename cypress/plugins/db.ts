import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/database.types";
import { ROOM_CHANGED, roomChannel } from "../../lib/roomChannel";

let client: SupabaseClient<Database> | undefined;

function localEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !publishableKey || !secretKey) {
    throw new Error("The Supabase env vars are missing. Is .env.local set up and Supabase running?");
  }
  if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url)) throw new Error(`Tests only use the local database, not ${url}`);
  return { url, publishableKey, secretKey };
}

export function db() {
  const { url, secretKey } = localEnv();
  client ??= createClient<Database>(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export async function newAnonymousUser() {
  const { url, publishableKey } = localEnv();
  const { data, error } = await createClient(url, publishableKey, { auth: { persistSession: false } }).auth.signInAnonymously();
  if (error || !data.user) throw error ?? new Error("Anonymous sign in failed");
  return data.user.id;
}

// what the app sends after every change, so pages open on the room reload (see announceRoomChange)
export async function pingRoom(code: string) {
  await db().channel(roomChannel(code)).httpSend(ROOM_CHANGED, {});
}
