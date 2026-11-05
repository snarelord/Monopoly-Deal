"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SetupScreen, { ActionPanel, BLUE_PANEL, ERROR, FIELD, LABEL, PANEL } from "@/components/SetupScreen";
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
    <SetupScreen
      title={
        <>
          Join <span className="text-highlight">{code}</span>
        </>
      }
      fit={3.7}
    >
      {/* contents, so the panels inside still sit in the screen's grid */}
      <form
        className="contents"
        onSubmit={(event) => {
          event.preventDefault();
          join();
        }}
      >
        <div className={PANEL}>
          <label className="flex flex-col gap-3">
            <span className={LABEL}>Your name</span>
            <input
              type="text"
              data-cy="join-name"
              maxLength={MAX_NAME_LENGTH}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={FIELD}
            />
          </label>
          {error && (
            <p data-cy="join-error" role="alert" className={ERROR}>
              {error}
            </p>
          )}
        </div>

        <div className={BLUE_PANEL}>
          <p className="wrap-break-word">{hostName ? `You're joining ${hostName}'s room.` : `You're joining room ${code}.`}</p>
        </div>

        <ActionPanel type="submit" data-cy="join-submit" disabled={busy} hint="Pick a name and you're in" label="Join" />
      </form>
    </SetupScreen>
  );
}
