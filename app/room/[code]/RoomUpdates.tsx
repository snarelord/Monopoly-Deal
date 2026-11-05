"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROOM_CHANGED, roomChannel } from "@/lib/roomChannel";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { seenVersions } from "./seenVersions";

export default function RoomUpdates({ code }: { code: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel(roomChannel(code))
      .on("broadcast", { event: ROOM_CHANGED }, ({ payload }) => {
        // this tab's own move has already updated its board. lobby changes have no version, so they always reload
        if (typeof payload?.version === "number" && payload.version <= (seenVersions.get(code) ?? -1)) return;
        router.refresh();
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") router.refresh();
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, router]);

  return null;
}
