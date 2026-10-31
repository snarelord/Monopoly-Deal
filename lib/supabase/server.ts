import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from "./database.types";

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // pages can't set cookies, only server actions can. the proxy keeps the session fresh instead
          }
        },
      },
    },
  );
}

export async function getUserId() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}