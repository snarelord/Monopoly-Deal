"use client";

import { useState } from "react";
import { ensureSignedIn } from "@/lib/supabase/signIn";
import { whoAmI } from "./actions";

// PLANNED: becomes the create/join page
export default function OnlinePage() {
  const [userId, setUserId] = useState<string | null>(null);

  return (
    <main className="grid min-h-dvh place-items-center gap-2 p-4">
      <button
        type="button"
        onClick={async () => {
          await ensureSignedIn();
          setUserId(await whoAmI());
        }}
        className="cursor-pointer rounded bg-green-700 px-4 py-2 text-white"
      >
        Who am I?
      </button>
      {userId && <p data-cy="user-id">{userId}</p>}
    </main>
  );
}
