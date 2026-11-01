"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROOM_CHANGED, roomChannel } from "@/lib/roomChannel";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export default function RoomUpdates({ code }: { code: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel(roomChannel(code))
      .on("broadcast", { event: ROOM_CHANGED }, () => router.refresh())
      .subscribe((status) => {
        // also runs after a reconnect, e.g. a phone waking up, to catch anything missed while offline
        if (status === "SUBSCRIBED") router.refresh();
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, router]);

  return null;
}
