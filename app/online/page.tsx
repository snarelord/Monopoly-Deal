"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MAX_NAME_LENGTH } from "@/lib/gameHelpers";
import { ROOM_CODE_LENGTH } from "@/lib/roomCode";
import { ensureSignedIn } from "@/lib/supabase/signIn";
import { createRoom, joinRoom } from "./actions";

export default function OnlinePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(action: () => ReturnType<typeof createRoom>) {
    setBusy(true);
    setError(null);
    try {
      await ensureSignedIn();
      const result = await action();
      if ("code" in result) {
        router.push(`/room/${result.code}`);
        return; // stay busy until the room page loads
      }
      setError(result.error);
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-lg border border-black/20 bg-white/70 p-6 text-black shadow">
        <h1 className="text-2xl font-bold">Play online</h1>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Your name
          <input
            type="text"
            data-cy="online-name"
            maxLength={MAX_NAME_LENGTH}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded border-2 border-black/30 bg-white px-2 py-1 font-normal focus:border-black"
          />
        </label>

        <button
          type="button"
          data-cy="create-room"
          disabled={busy}
          onClick={() => go(() => createRoom(name))}
          className="cursor-pointer rounded bg-green-700 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Create a room
        </button>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            go(() => joinRoom(code, name));
          }}
        >
          <input
            type="text"
            data-cy="room-code"
            aria-label="Room code"
            placeholder="Code"
            maxLength={ROOM_CODE_LENGTH}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded border-2 border-black/30 bg-white px-2 py-1 tracking-widest focus:border-black"
          />
          <button
            type="submit"
            data-cy="join-room"
            disabled={busy}
            className="cursor-pointer rounded border-2 border-green-700 px-4 py-1 text-green-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Join
          </button>
        </form>

        {error && (
          <p data-cy="online-error" role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <Link href="/" className="text-xs text-black/60 underline">
          Play on one device instead
        </Link>
      </div>
    </main>
  );
}
