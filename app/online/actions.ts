"use server";

import { after } from "next/server";
import { beginGame, applyMove, MAX_NAME_LENGTH, MAX_PLAYERS, MIN_PLAYERS } from "@/lib/gameHelpers";
import { makeRoomCode, ROOM_CODE_LENGTH, tidyCode } from "@/lib/roomCode";
import { announceRoomChange, getGame, getLobby } from "@/lib/rooms";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { GameState, Move, MoveResult } from "@/lib/types";
import type { Json } from "@/lib/supabase/database.types";
import { getUserId } from "@/lib/supabase/server";

const UNIQUE_VIOLATION = "23505";
const NOT_SIGNED_IN = { error: "You're not signed in. Refresh the page and try again." };

function nameProblem(name: string): string | null {
  if (name.length === 0) return "Enter your name first.";
  if (name.length > MAX_NAME_LENGTH) return `Names can be up to ${MAX_NAME_LENGTH} characters.`;
  return null;
}

export async function createRoom(rawName: string): Promise<{ code: string } | { error: string }> {
  const userId = await getUserId();
  if (!userId) return NOT_SIGNED_IN;
  const name = rawName.trim();
  const problem = nameProblem(name);
  if (problem) return { error: problem };

  const db = createAdminSupabase();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeRoomCode();
    const { error } = await db.from("rooms").insert({ code, host_id: userId });
    if (error?.code === UNIQUE_VIOLATION) continue;
    if (error) return { error: "Couldn't create a room. Try again." };

    const { error: seatError } = await db
      .from("room_players")
      .insert({ room_code: code, user_id: userId, seat: 0, display_name: name });
    if (seatError) {
      await db.from("rooms").delete().eq("code", code); // don't leave an empty room behind CHECK if this is working in test db
      return { error: "Couldn't create a room. Try again." };
    }
    return { code };
  }
  return { error: "Couldn't find a free room code. Try again." };
}

export async function joinRoom(rawCode: string, rawName: string): Promise<{ code: string } | { error: string }> {
  const userId = await getUserId();
  if (!userId) return NOT_SIGNED_IN;
  const code = tidyCode(rawCode);
  if (code.length !== ROOM_CODE_LENGTH) return { error: `Room codes are ${ROOM_CODE_LENGTH} letters.` };
  const name = rawName.trim();
  const problem = nameProblem(name);
  if (problem) return { error: problem };

  const lobby = await getLobby(code);
  if (!lobby) return { error: `There's no room ${code}.` };
  const { status, players } = lobby;
  if (players.some((p) => p.user_id === userId)) return { code }; // already in, e.g. from another tab
  if (status !== "lobby") return { error: "That game has already started." };
  if (players.length >= MAX_PLAYERS) return { error: "That room is full." };
  if (players.some((p) => p.display_name.toLowerCase() === name.toLowerCase())) {
    return { error: "Someone in that room already has that name." };
  }

  const seat = Math.max(-1, ...players.map((p) => p.seat)) + 1;
  const { error } = await createAdminSupabase()
    .from("room_players")
    .insert({ room_code: code, user_id: userId, seat, display_name: name });
  if (error?.code === UNIQUE_VIOLATION) return { error: "Someone else joined at the same moment. Try again." };
  if (error) return { error: "Couldn't join. Try again." };
  after(() => announceRoomChange(code)); // runs once the reply is sent, so the joiner isn't kept waiting
  return { code };
}

export async function leaveRoom(rawCode: string): Promise<{ error: string } | null> {
  const userId = await getUserId();
  if (!userId) return NOT_SIGNED_IN;
  const code = tidyCode(rawCode);
  const lobby = await getLobby(code);
  if (!lobby) return null; // already gone
  // PLANNED: leaving mid-game needs its own rules (skip their turns? hand their cards back?)
  if (lobby.status !== "lobby") return { error: "The game has already started." };

  const db = createAdminSupabase();
  const { error } =
    lobby.host_id === userId
      ? await db.from("rooms").delete().eq("code", code) // the host leaving closes the room. their row goes with it (on delete cascade) CHECK
      : await db.from("room_players").delete().eq("room_code", code).eq("user_id", userId);
  if (error) return { error: "Couldn't leave. Try again." };
  after(() => announceRoomChange(code));
  return null;
}

export async function startGame(rawCode: string): Promise<{ error: string } | null> {
  const userId = await getUserId();
  if (!userId) return NOT_SIGNED_IN;
  const code = tidyCode(rawCode);
  const lobby = await getLobby(code);
  if (!lobby) return { error: `There's no room ${code}.` };
  if (lobby.host_id !== userId) return { error: "Only the host can start the game." };
  if (lobby.status !== "lobby") return null; // already started, e.g. a double click
  if (lobby.players.length < MIN_PLAYERS) return { error: `You need at least ${MIN_PLAYERS} players.` };

  const db = createAdminSupabase();
  // only one request can move the room out of the lobby, and joinRoom turns people away after this
  const { data: claimed } = await db
    .from("rooms")
    .update({ status: "playing" })
    .eq("code", code)
    .eq("status", "lobby")
    .select("code");
  if (!claimed?.length) return null; // another start got there first

  const reopen = async (error: string) => {
    await db.from("rooms").update({ status: "lobby" }).eq("code", code);
    return { error };
  };

  // read the players again, in case someone joined or left since the checks above
  const players = (await getLobby(code))?.players ?? [];
  if (players.length < MIN_PLAYERS) return reopen(`You need at least ${MIN_PLAYERS} players.`);

  // from here on a player's seat is their id in the game (0, 1, 2...), so close any gaps left by people leaving
  for (const [index, player] of players.entries()) {
    if (player.seat === index) continue;
    const { error } = await db
      .from("room_players")
      .update({ seat: index })
      .eq("room_code", code)
      .eq("user_id", player.user_id);
    if (error) return reopen("Couldn't start the game. Try again.");
  }

  const game = beginGame(players.map((p) => p.display_name));
  // GameState is plain JSON, but TypeScript can't tell that from the interface
  const { error } = await db.from("games").insert({ room_code: code, state: game as unknown as NonNullable<Json> });
  if (error) return reopen("Couldn't start the game. Try again.");
  after(() => announceRoomChange(code));
  return null;
}

function tryMove(state: GameState, seat: number, move: Move): MoveResult {
  try {
    return applyMove(state, seat, move)
  } catch {
    return { ok: false, error: "That move isn't allowed." };
  }
}

export async function makeMove(rawCode: string, move: Move): Promise<{ error: string } | null> {
  const userId = await getUserId();
  if(!userId) return NOT_SIGNED_IN;
  const code = tidyCode(rawCode);

  const seat = (await getLobby(code))?.players.find((player) => player.user_id === userId)?.seat;
  if (seat === undefined || null) return { error: "You're not in this game."};

  const db = createAdminSupabase();
  for (let attempt = 0; attempt < 3; attempt++) {
    const game = await getGame(code);
    if (!game) return { error: "This game hasn't started yet."};
    const result = tryMove(game.state, seat, move);
    if (!result.ok) return { error: result.error };

    const { data: saved, error } = await db.from("games").update({
      state: result.game as unknown as NonNullable<Json>,
      version: game.version + 1,
      updated_at: new Date().toISOString(),
    }).eq("room_code", code).eq("version", game.version).select("version");

    if (error) return { error: "Couldn't save your move. Try again." }
    if (saved.length > 0) {
      after(() => announceRoomChange(code));
      return null;
    }
  }
  return { error: "Lots happening at once. Try that again." };
}