"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { leaveRoom, startGame } from "@/app/online/actions";

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
      className="cursor-pointer rounded border-2 border-black/30 py-1.5 text-sm hover:border-black"
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
    <>
      <button
        type="button"
        data-cy="start-game"
        disabled={busy || !canStart}
        onClick={start}
        className="cursor-pointer rounded bg-green-700 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Start the game
      </button>
      {error && (
        <p data-cy="start-error" role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </>
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
        className="cursor-pointer self-start text-sm text-red-700 underline disabled:opacity-40"
      >
        {isHost ? "Close the room" : "Leave the room"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </>
  );
}
