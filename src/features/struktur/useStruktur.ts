"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { Slot } from "./logic";

export type StrukturData = { structureId: string | null; slots: Slot[]; classTotals: { name: string; jp: number }[] };

async function fetchStruktur(yearId: string): Promise<{ data: StrukturData | null; error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { data: null, error: "Konfigurasi Supabase tidak ditemukan." };
  const st = await sb.from("time_structures").select("id").eq("academic_year_id", yearId).eq("is_active", true).limit(1);
  if (st.error) return { data: null, error: st.error.message };
  const structureId = st.data?.[0]?.id ?? null;
  const [sl, cl, as] = await Promise.all([
    structureId ? sb.from("time_slots").select("id,day_of_week,sequence_no,slot_type,label,starts_at,ends_at,jam_ke").eq("structure_id", structureId).order("day_of_week").order("sequence_no") : Promise.resolve({ data: [], error: null }),
    sb.from("classes").select("id,name").eq("academic_year_id", yearId),
    sb.from("teaching_assignments").select("id").eq("academic_year_id", yearId),
  ]);
  const err = sl.error ?? cl.error ?? as.error;
  if (err) return { data: null, error: err.message };
  const ids = (as.data ?? []).map((a) => a.id);
  const ac = ids.length ? await sb.from("teaching_assignment_classes").select("class_id,jp_per_week").in("teaching_assignment_id", ids) : { data: [], error: null };
  if (ac.error) return { data: null, error: ac.error.message };
  const classTotals = (cl.data ?? []).map((c) => ({ name: c.name, jp: (ac.data ?? []).filter((r) => r.class_id === c.id).reduce((s, r) => s + r.jp_per_week, 0) })).filter((c) => c.jp > 0);
  return { data: { structureId, slots: (sl.data ?? []) as Slot[], classTotals }, error: null };
}

export function useStruktur(yearId: string | null) {
  const [state, setState] = useState<{ data: StrukturData | null; error: string | null; loaded: boolean }>({ data: null, error: null, loaded: false });
  useEffect(() => {
    if (!yearId) return;
    let alive = true;
    fetchStruktur(yearId).then((r) => { if (alive) setState({ ...r, loaded: true }); });
    return () => { alive = false; };
  }, [yearId]);
  const reload = useCallback(async () => { if (yearId) setState({ ...(await fetchStruktur(yearId)), loaded: true }); }, [yearId]);
  return { ...state, reload };
}
