import type { SupabaseClient } from "@supabase/supabase-js";
import { applyMove } from "./gameHelpers";
import type { Database, Json } from "./supabase/database.types";
import type { GameState, Move, MoveResult } from "./types";

type Db = SupabaseClient<Database>;

export async function loadGame(db: Db, code: string) {
  const { data } = await db.from("games").select("state, version").eq("room_code", code).maybeSingle();
  return data && { state: data.state as unknown as GameState, version: data.version };
}

function tryMove(state: GameState, seat: number, move: Move): MoveResult {
  try {
    return applyMove(state, seat, move);
  } catch {
    return { ok: false, error: "That move isn't allowed." };
  }
}

export async function saveMove(
  db: Db,
  code: string,
  seat: number,
  move: Move,
): Promise<{ error: string } | { state: GameState; version: number }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const game = await loadGame(db, code);
    if (!game) return { error: "This game hasn't started yet." };
    const result = tryMove(game.state, seat, move);
    if (!result.ok) return { error: result.error };

    const version = game.version + 1;
    const { data: saved, error } = await db
      .from("games")
      .update({
        state: result.game as unknown as NonNullable<Json>,
        version,
        updated_at: new Date().toISOString(),
      })
      .eq("room_code", code)
      .eq("version", game.version)
      .select("version");
    if (error) return { error: "Couldn't save your move. Try again." };
    if (saved.length > 0) return { state: result.game, version };
  }
  return { error: "Lots happening at once. Try that again." };
}
