import { db, newAnonymousUser, pingRoom } from "./db";

export const roomPlugins = {
  async getRoom({ code }: { code: string }) {
    const { data, error } = await db()
      .from("rooms")
      .select("code, host_id, status, room_players(user_id, seat, display_name)")
      .eq("code", code)
      .order("seat", { referencedTable: "room_players" })
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async joinRoom({ code, name }: { code: string; name: string }) {
    const userId = await newAnonymousUser();
    const { data: taken, error: readError } = await db().from("room_players").select("seat").eq("room_code", code);
    if (readError) throw readError;
    const seat = Math.max(-1, ...taken.map((p) => p.seat)) + 1;
    const { error } = await db().from("room_players").insert({ room_code: code, user_id: userId, seat, display_name: name });
    if (error) throw error;
    await pingRoom(code);
    return { userId, seat };
  },

  async deleteRoom({ code }: { code: string }) {
    const { error } = await db().from("rooms").delete().eq("code", code);
    if (error) throw error;
    return null;
  },
};

export type Room = Awaited<ReturnType<typeof roomPlugins.getRoom>>;
