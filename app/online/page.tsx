"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SetupScreen, { ActionPanel, BLUE_PANEL, ERROR, FIELD, LABEL, PANEL, QUIET_LINK } from "@/components/SetupScreen";
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
    <SetupScreen title="Play online" fit={3.82} back="/">
      <div className={PANEL}>
        <label className="flex flex-col gap-3">
          <span className={LABEL}>Your name</span>
          <input
            type="text"
            data-cy="online-name"
            maxLength={MAX_NAME_LENGTH}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={FIELD}
          />
        </label>

        {error && (
          <p data-cy="online-error" role="alert" className={ERROR}>
            {error}
          </p>
        )}

        <Link href="/local" className={`mt-auto ${QUIET_LINK}`}>
          Play local instead
        </Link>
      </div>

      <form
        className={BLUE_PANEL}
        onSubmit={(event) => {
          event.preventDefault();
          go(() => joinRoom(code, name));
        }}
      >
        <div className="flex flex-col gap-3">
          <h2 className={LABEL}>Join a room</h2>
          <div className="flex gap-2">
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
              className={`${FIELD} flex-1 tracking-widest`}
            />
            <button
              type="submit"
              data-cy="join-room"
              disabled={busy}
              className="h-11 cursor-pointer border-2 border-paper/35 px-4 font-heading text-2xl hover:border-paper disabled:cursor-not-allowed disabled:opacity-40"
            >
              Join
            </button>
          </div>
        </div>
      </form>

      <ActionPanel
        type="button"
        data-cy="create-room"
        disabled={busy}
        onClick={() => go(() => createRoom(name))}
        hint="Then send your friends the link"
        label="Create a room"
      />
    </SetupScreen>
  );
}
