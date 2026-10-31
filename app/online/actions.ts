"use server";

import { getUserId } from "@/lib/supabase/server";

export async function whoAmI() {
  return getUserId();
}
