"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_NAME_LENGTH } from "@/lib/gameHelpers";
import { ensureSignedIn } from "@/lib/supabase/signIn";
import { joinRoom } from "@/app/online/actions";

// for someone who opened an invite link
export default function JoinForm({ code, hostName }: { code: string; hostName?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      await ensureSignedIn();
      const result = await joinRoom(code, name);
      if ("code" in result) {
        router.refresh(); // same address, loaded again: this time you're in the room
        return;
      }
      setError(result.error);
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        join();
      }}
    >
      <h1 className="text-2xl font-bold wrap-break-word">{hostName ? `Join ${hostName}'s room` : `Join room ${code}`}</h1>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Your name
        <input
          type="text"
          data-cy="join-name"
          maxLength={MAX_NAME_LENGTH}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded border-2 border-black/30 bg-white px-2 py-1 font-normal focus:border-black"
        />
      </label>
      <button
        type="submit"
        data-cy="join-submit"
        disabled={busy}
        className="cursor-pointer rounded bg-green-700 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Join
      </button>
      {error && (
        <p data-cy="join-error" role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
