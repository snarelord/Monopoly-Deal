import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/gameHelpers";
import { viewFor } from "@/lib/playerView";
import { tidyCode } from "@/lib/roomCode";
import { getGame, getLobby, type Lobby } from "@/lib/rooms";
import { getUserId } from "@/lib/supabase/server";
import JoinForm from "./JoinForm";
import { CopyLinkButton, LeaveButton, StartButton } from "./LobbyButtons";
import OnlineGame from "./OnlineGame";
import RoomUpdates from "./RoomUpdates";

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    // the code, the cookie and the database are only known when someone visits so this part waits for them
    <Suspense
      fallback={
        <Panel>
          <p className="text-sm text-black/60">Loading the room…</p>
        </Panel>
      }
    >
      <Room params={params} />
    </Suspense>
  );
}

function Panel({ children, ...props }: { children: ReactNode; "data-cy"?: string }) {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div
        {...props}
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-black/20 bg-white/70 p-6 text-black shadow"
      >
        {children}
      </div>
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
    <Panel data-cy="no-room">
      <h1 className="text-2xl font-bold">No room {code}</h1>
      <p className="text-sm">Check the code. The room may also have closed when its host left.</p>
      <Link href="/online" className="text-sm underline">
        Create or join a room
      </Link>
    </Panel>
  );
}

function RoomView({ code, userId, lobby }: { code: string; userId: string | null; lobby: Lobby }) {
  const host = lobby.players.find((p) => p.user_id === lobby.host_id);
  const mine = lobby.players.find((p) => p.user_id === userId);

  if (!mine) {
    return (
      <Panel>
        {lobby.status === "lobby" ? (
          <JoinForm code={code} hostName={host?.display_name} />
        ) : (
          <p className="text-sm">This game has already started.</p>
        )}
      </Panel>
    );
  }

  if (lobby.status !== "lobby") return <GameView code={code} seat={mine.seat} />;

  const isHost = userId === lobby.host_id;
  return (
    <Panel data-cy="lobby">
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
    </Panel>
  );
}

// startGame gives each seat the same number as its player id, so the seat says whose hand this is
async function GameView({ code, seat }: { code: string; seat: number }) {
  const game = await getGame(code);
  // the room is marked as started a moment before the game is saved. the ping after the save reloads this
  if (!game) {
    return (
      <Panel data-cy="dealing">
        <p className="text-sm">Dealing the cards…</p>
      </Panel>
    );
  }
  // they joined in the moment between the host pressing Start and the game being dealt
  if (!game.state.players.some((p) => p.id === seat)) {
    return (
      <Panel data-cy="not-in-game">
        <p className="text-sm">This game started without you.</p>
        <Link href="/online" className="text-sm underline">
          Create or join another room
        </Link>
      </Panel>
    );
  }
  return (
    <main>
      <OnlineGame view={viewFor(game.state, seat)} />
    </main>
  );
}
