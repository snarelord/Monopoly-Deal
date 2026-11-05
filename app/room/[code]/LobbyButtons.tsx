"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { leaveRoom, startGame } from "@/app/online/actions";
import { ActionPanel, ERROR, QUIET_LINK } from "@/components/SetupScreen";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      data-cy="copy-link"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
        } catch {
          // the browser blocked it. the code is on screen anyway
        }
      }}
      className="h-12 w-full cursor-pointer border-2 border-paper/35 font-heading text-2xl hover:border-paper"
    >
      {copied ? "Link copied" : "Copy invite link"}
    </button>
  );
}

export function StartButton({ code, canStart }: { code: string; canStart: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const result = await startGame(code);
      if (!result) {
        router.refresh(); // the room's status has changed, so load the page again
        return;
      }
      setError(result.error);
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <div className="flex min-w-0 flex-col">
      <ActionPanel
        type="button"
        data-cy="start-game"
        disabled={busy || !canStart}
        onClick={start}
        hint="Deals the cards for everyone"
        label="Start the game"
        className="flex-1"
      />
      {error && (
        <p data-cy="start-error" role="alert" className={`bg-primary p-3 ${ERROR}`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function LeaveButton({ code, isHost }: { code: string; isHost: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function leave() {
    setBusy(true);
    try {
      const result = await leaveRoom(code);
      if (!result) {
        router.push("/online");
        return;
      }
      setError(result.error);
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        data-cy="leave-room"
        disabled={busy}
        onClick={leave}
        className={`mt-auto cursor-pointer disabled:opacity-40 ${QUIET_LINK}`}
      >
        {isHost ? "Close the room" : "Leave the room"}
      </button>
      {error && (
        <p role="alert" className={ERROR}>
          {error}
        </p>
      )}
    </>
  );
}
