import "server-only";
import { io } from "next/cache";
import { createAdminSupabase } from "./supabase/admin";
import { loadGame } from "./gameStore";
import { ROOM_CHANGED, roomChannel } from "./roomChannel";

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

export async function getSeat(code: string, userId: string) {
  const { data } = await createAdminSupabase()
    .from("room_players")
    .select("seat")
    .eq("room_code", code)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.seat ?? null;
}

export async function getGame(code: string) {
  await io();
  return loadGame(createAdminSupabase(), code);
}

// the message carries no game data. pages that hear it load the room again through the server,
// and the version lets a page skip that if it already has this move
export async function announceRoomChange(code: string, version?: number) {
  try {
    await createAdminSupabase().channel(roomChannel(code)).httpSend(ROOM_CHANGED, { version });
  } catch (error) {
    console.error(`Couldn't announce a change to room ${code}`, error); // others see it when they next load the page
  }
}
