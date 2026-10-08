"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

export type ConnState = { db: "wait" | "ok" | "down"; realtime: boolean };

// Status nyata: /api/health (server cek Supabase) + kanal Realtime Supabase.
// Tidak ada status buatan; bila gagal, lencana ikut merah.
export function useConnection(): ConnState {
  const [state, setState] = useState<ConnState>({ db: "wait", realtime: false });

  useEffect(() => {
    let alive = true;
    async function check() {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const json = (await res.json()) as { supabase?: string };
        if (alive) setState((s) => ({ ...s, db: res.ok && json.supabase === "ok" ? "ok" : "down" }));
      } catch {
        if (alive) setState((s) => ({ ...s, db: "down" }));
      }
    }
    void check();
    const timer = setInterval(check, 30000);

    const sb = getSupabase();
    const channel = sb?.channel("sakala-status");
    channel?.subscribe((status) => {
      if (alive) setState((s) => ({ ...s, realtime: status === "SUBSCRIBED" }));
    });

    return () => {
      alive = false;
      clearInterval(timer);
      if (sb && channel) void sb.removeChannel(channel);
    };
  }, []);

  return state;
}

export function connLabel(c: ConnState) {
  if (c.db === "wait") return "Menyambung…";
  if (c.db === "down") return "Terputus";
  return c.realtime ? "Semua data terintegrasi · Realtime" : "Semua data terintegrasi";
}
