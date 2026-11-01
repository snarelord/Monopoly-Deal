import { Suspense } from "react";
import Link from "next/link";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/gameHelpers";
import { tidyCode } from "@/lib/roomCode";
import { getLobby, type Lobby } from "@/lib/rooms";
import { getUserId } from "@/lib/supabase/server";
import JoinForm from "./JoinForm";
import { CopyLinkButton, LeaveButton, StartButton } from "./LobbyButtons";
import RoomUpdates from "./RoomUpdates";

const card = "flex w-full max-w-sm flex-col gap-4 rounded-lg border border-black/20 bg-white/70 p-6 text-black shadow";

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      {/* the code, the cookie and the database are only known when someone visits, so this part waits for them */}
      <Suspense fallback={<p className="text-sm text-black/60">Loading the room…</p>}>
        <Room params={params} />
      </Suspense>
    </main>
  );
}

async function Room({ params }: { params: Promise<{ code: string }> }) {
  const code = tidyCode((await params).code);
  const [userId, lobby] = await Promise.all([getUserId(), getLobby(code)]);
  if (!lobby) return <NoRoom code={code} />;

  return (
    <>
      {/* outside the views, so it stays connected when the page swaps from one to another */}
      <RoomUpdates code={code} />
      <RoomView code={code} userId={userId} lobby={lobby} />
    </>
  );
}

function NoRoom({ code }: { code: string }) {
  return (
    <div data-cy="no-room" className={card}>
      <h1 className="text-2xl font-bold">No room {code}</h1>
      <p className="text-sm">Check the code. The room may also have closed when its host left.</p>
      <Link href="/online" className="text-sm underline">
        Create or join a room
      </Link>
    </div>
  );
}

function RoomView({ code, userId, lobby }: { code: string; userId: string | null; lobby: Lobby }) {
  const host = lobby.players.find((p) => p.user_id === lobby.host_id);
  const inRoom = lobby.players.some((p) => p.user_id === userId);

  if (!inRoom) {
    return (
      <div className={card}>
        {lobby.status === "lobby" ? (
          <JoinForm code={code} hostName={host?.display_name} />
        ) : (
          <p className="text-sm">This game has already started.</p>
        )}
      </div>
    );
  }

  // PLANNED: the board goes here, from each player's own view of the game
  if (lobby.status !== "lobby") {
    return (
      <div data-cy="game-started" className={card}>
        <p className="text-sm">The game has started.</p>
      </div>
    );
  }

  const isHost = userId === lobby.host_id;
  return (
    <div data-cy="lobby" className={card}>
      <div>
        <p className="text-xs font-semibold tracking-wide text-black/60 uppercase">Room code</p>
        <p data-cy="lobby-code" className="text-4xl font-bold tracking-widest">
          {code}
        </p>
      </div>
      <CopyLinkButton />

      <ol className="flex flex-col gap-1">
        {lobby.players.map((p) => (
          <li
            key={p.seat}
            data-cy="lobby-player"
            className="flex items-baseline justify-between gap-2 rounded border border-black/10 bg-white px-3 py-1.5"
          >
            <span className="truncate">
              {p.display_name}
              {p.user_id === userId && " (you)"}
            </span>
            {p.user_id === lobby.host_id && <span className="shrink-0 text-xs text-black/60">host</span>}
          </li>
        ))}
      </ol>
      <p className="text-xs text-black/60">
        {lobby.players.length} of {MAX_PLAYERS} players.{" "}
        {isHost
          ? lobby.players.length < MIN_PLAYERS
            ? "Share the code. You can start once someone joins."
            : "Start when everyone's in."
          : `Waiting for ${host?.display_name} to start.`}
      </p>

      {isHost && <StartButton code={code} canStart={lobby.players.length >= MIN_PLAYERS} />}
      <LeaveButton code={code} isHost={isHost} />
    </div>
  );
}
