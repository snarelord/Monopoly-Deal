import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/gameHelpers";
import { viewFor } from "@/lib/playerView";
import { tidyCode } from "@/lib/roomCode";
import { getGame, getLobby, type Lobby } from "@/lib/rooms";
import { getUserId } from "@/lib/supabase/server";
import HouseRules from "@/components/HouseRules";
import SetupScreen, { ACTION_LABEL, ACTION_PANEL, BLUE_PANEL, LABEL, PANEL, QUIET_LINK } from "@/components/SetupScreen";
import JoinForm from "./JoinForm";
import { CopyLinkButton, LeaveButton, StartButton } from "./LobbyButtons";
import OnlineGame from "./OnlineGame";
import RoomUpdates from "./RoomUpdates";

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    // the code, the cookie and the database are only known when someone visits so this part waits for them
    <Suspense
      fallback={
        <Message title="Loading" fit={2.58}>
          <p>Loading the room…</p>
        </Message>
      }
    >
      <Room params={params} />
    </Suspense>
  );
}

function Message({ title, fit, children, ...props }: { title: string; fit: number; children: ReactNode; "data-cy"?: string }) {
  return (
    <SetupScreen title={title} fit={fit} {...props}>
      <div className={`${PANEL} lg:col-span-full`}>{children}</div>
    </SetupScreen>
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
    <Message data-cy="no-room" title="No room" fit={2.75}>
      <p className="wrap-anywhere">There&apos;s no room {code}. Check the code. The room may also have closed when its host left.</p>
      <Link href="/online" className={QUIET_LINK}>
        Create or join a room
      </Link>
    </Message>
  );
}

function RoomView({ code, userId, lobby }: { code: string; userId: string | null; lobby: Lobby }) {
  const host = lobby.players.find((p) => p.user_id === lobby.host_id);
  const mine = lobby.players.find((p) => p.user_id === userId);

  if (!mine) {
    if (lobby.status === "lobby") return <JoinForm code={code} hostName={host?.display_name} />;
    return (
      <Message title="Too late" fit={2.77}>
        <p>This game has already started.</p>
      </Message>
    );
  }

  if (lobby.status !== "lobby") return <GameView code={code} seat={mine.seat} />;

  const isHost = userId === lobby.host_id;
  return (
    <SetupScreen
      data-cy="lobby"
      title={
        <>
          Room{" "}
          <span data-cy="lobby-code" className="text-highlight">
            {code}
          </span>
        </>
      }
      fit={4.16}
    >
      <div className={PANEL}>
        <div>
          <h2 className={`${LABEL} mb-3`}>Players</h2>
          <ol>
            {lobby.players.map((p) => (
              <li
                key={p.seat}
                data-cy="lobby-player"
                className="flex items-baseline justify-between gap-2 border-t border-paper/20 py-2"
              >
                <span className="truncate">
                  {p.display_name}
                  {p.user_id === userId && " (you)"}
                </span>
                {p.user_id === lobby.host_id && <span className="shrink-0 text-sm text-paper/80">host</span>}
              </li>
            ))}
          </ol>
        </div>

        <p className="text-sm text-paper/80">
          {lobby.players.length} of {MAX_PLAYERS} players.
          {isHost &&
            (lobby.players.length < MIN_PLAYERS ? " Share the code. You can start once someone joins." : " Start when everyone's in.")}
        </p>

        <LeaveButton code={code} isHost={isHost} />
      </div>

      <div className={BLUE_PANEL}>
        <CopyLinkButton />
        {isHost && <HouseRules />}
      </div>

      {isHost ? (
        <StartButton code={code} canStart={lobby.players.length >= MIN_PLAYERS} />
      ) : (
        <div className={ACTION_PANEL}>
          <span className="leading-snug">{host?.display_name} starts the game</span>
          <span className={ACTION_LABEL}>Waiting</span>
        </div>
      )}
    </SetupScreen>
  );
}

// startGame gives each seat the same number as its player id, so the seat says whose hand this is
async function GameView({ code, seat }: { code: string; seat: number }) {
  const game = await getGame(code);
  // the room is marked as started a moment before the game is saved. the ping after the save reloads this
  if (!game) {
    return (
      <Message data-cy="dealing" title="Dealing" fit={2.55}>
        <p>Dealing the cards…</p>
      </Message>
    );
  }
  // they joined in the moment between the host pressing Start and the game being dealt
  if (!game.state.players.some((p) => p.id === seat)) {
    return (
      <Message data-cy="not-in-game" title="Too late" fit={2.77}>
        <p>This game started without you.</p>
        <Link href="/online" className={QUIET_LINK}>
          Create or join another room
        </Link>
      </Message>
    );
  }
  return (
    <main>
      <OnlineGame code={code} view={viewFor(game.state, seat)} version={game.version} />
    </main>
  );
}
