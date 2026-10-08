"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

export type BerandaData = {
  loading: boolean;
  error: boolean;
  school: string | null;
  counts: { teachers: number; subjects: number; classes: number; rooms: number; assignments: number };
};

const EMPTY: BerandaData = {
  loading: true, error: false, school: null,
  counts: { teachers: 0, subjects: 0, classes: 0, rooms: 0, assignments: 0 },
};

// Semua angka dibaca dari database. Tidak ada data contoh.
export function useBeranda(): BerandaData {
  const [data, setData] = useState<BerandaData>(EMPTY);

  useEffect(() => {
    let alive = true;
    const sb = getSupabase();
    if (!sb) { queueMicrotask(() => alive && setData({ ...EMPTY, loading: false, error: true })); return; }
    const count = async (t: string) => {
      const { count: c, error } = await sb.from(t).select("*", { count: "exact", head: true });
      if (error) throw error;
      return c ?? 0;
    };
    (async () => {
      try {
        const [teachers, subjects, classes, rooms, assignments, sch] = await Promise.all([
          count("teachers"), count("subjects"), count("classes"), count("rooms"), count("teaching_assignments"),
          sb.from("schools").select("name").limit(1),
        ]);
        if (sch.error) throw sch.error;
        if (alive) setData({ loading: false, error: false, school: sch.data?.[0]?.name ?? null, counts: { teachers, subjects, classes, rooms, assignments } });
      } catch {
        if (alive) setData({ ...EMPTY, loading: false, error: true });
      }
    })();
    return () => { alive = false; };
  }, []);

  return data;
}
