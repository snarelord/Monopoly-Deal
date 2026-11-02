import { db } from "./db";

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

  async deleteRoom({ code }: { code: string }) {
    const { error } = await db().from("rooms").delete().eq("code", code);
    if (error) throw error;
    return null;
  },
};

export type Room = Awaited<ReturnType<typeof roomPlugins.getRoom>>;
