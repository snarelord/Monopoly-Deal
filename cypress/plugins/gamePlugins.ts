import { beginGame } from "../../lib/gameHelpers";
import { loadGame, saveMove } from "../../lib/gameStore";
import type { Json } from "../../lib/supabase/database.types";
import type { Move } from "../../lib/types";
import { db, pingRoom } from "./db";

type Seat = { code: string; seat: number };

async function play(code: string, seat: number, move: Move) {
  const result = await saveMove(db(), code, seat, move);
  if ("error" in result) throw new Error(`Seat ${seat} couldn't ${move.type}: ${result.error}`);
  await pingRoom(code);
}

async function handOf(code: string, seat: number) {
  const game = await loadGame(db(), code);
  const player = game?.state.players.find((p) => p.id === seat);
  if (!player) throw new Error(`Room ${code} has no game with a seat ${seat}`);
  return player.hand;
}

export const gamePlugins = {
  async getGame({ code }: { code: string }) {
    return (await loadGame(db(), code))?.state ?? null;
  },

  async dealGame({ code, seed }: { code: string; seed: number }) {
    const { data: players, error: readError } = await db()
      .from("room_players")
      .select("display_name")
      .eq("room_code", code)
      .order("seat");
    if (readError) throw readError;
    const state = beginGame(players.map((p) => p.display_name), seed);
    const { data: saved, error } = await db()
      .from("games")
      .update({ state: state as unknown as NonNullable<Json>, version: 0, updated_at: new Date().toISOString() })
      .eq("room_code", code)
      .select("room_code");
    if (error) throw error;
    if (!saved.length) throw new Error(`Room ${code} hasn't started a game to deal again`);
    await pingRoom(code);
    return null;
  },

  async drawCards({ code, seat }: Seat) {
    await play(code, seat, { type: "draw" });
    return null;
  },

  async bankCard({ code, seat, cardId }: Seat & { cardId?: string }) {
    const id = cardId ?? (await handOf(code, seat)).find((c) => c.type !== "property" && c.type !== "wildcard")?.id;
    if (!id) throw new Error(`Seat ${seat} has nothing they can bank`);
    await play(code, seat, { type: "bank", cardId: id });
    return id;
  },

  async placeProperty({ code, seat, cardId }: Seat & { cardId?: string }) {
    const id = cardId ?? (await handOf(code, seat)).find((c) => c.type === "property")?.id;
    if (!id) throw new Error(`Seat ${seat} has no property to put down`);
    await play(code, seat, { type: "place-property", cardId: id });
    return id;
  },

  async endTurn({ code, seat }: Seat) {
    await play(code, seat, { type: "end-turn" });
    return null;
  },
};
