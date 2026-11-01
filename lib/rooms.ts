import "server-only";
import { io } from "next/cache";
import { createAdminSupabase } from "./supabase/admin";
import { ROOM_CHANGED, roomChannel } from "./roomChannel";
import type { GameState } from "./types";

export async function getLobby(code: string) {
  await io(); // creating the client reads the clock, so tell Next this is request-time work first
  const db = createAdminSupabase();
  const [{ data: room }, { data: players }] = await Promise.all([
    db.from("rooms").select("status, host_id").eq("code", code).maybeSingle(),
    db.from("room_players").select("user_id, seat, display_name").eq("room_code", code).order("seat"),
  ]);
  if (!room || !players) return null;
  return { ...room, players };
}

export type Lobby = NonNullable<Awaited<ReturnType<typeof getLobby>>>;

// the whole game, hands and deck included, so it never goes to a browser as it is. see viewFor
export async function getGame(code: string) {
  await io();
  const { data } = await createAdminSupabase()
    .from("games")
    .select("state, version")
    .eq("room_code", code)
    .maybeSingle();
  return data && { state: data.state as unknown as GameState, version: data.version };
}

// the message carries no data. pages that hear it load the room again through the server
export async function announceRoomChange(code: string) {
  try {
    await createAdminSupabase().channel(roomChannel(code)).httpSend(ROOM_CHANGED, {});
  } catch (error) {
    console.error(`Couldn't announce a change to room ${code}`, error); // others see it when they next load the page
  }
}
