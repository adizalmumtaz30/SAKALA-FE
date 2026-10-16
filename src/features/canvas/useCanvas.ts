"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { Slot } from "@/features/struktur/logic";
import type { Asg } from "@/features/beban/useBeban";

export type Ver = { id: string; version_no: number; status: "DRAFT" | "PREVIEW" | "ACTIVE" | "ARCHIVED" };
export type Entry = { id: string; class_id: string; time_slot_id: string; teaching_assignment_id: string; teacher_id: string | null; subject_id: string | null; is_locked: boolean };
export type Named = { id: string; name: string };
export type CanvasData = {
  slots: Slot[]; classes: Named[]; teachers: Named[]; subjects: (Named & { color_token: string | null })[];
  asg: Asg[]; versions: Ver[]; entries: Entry[]; active: Ver | null; working: Ver | null; viewing: Ver | null;
};

async function fetchCanvas(schoolId: string, yearId: string): Promise<{ data: CanvasData | null; error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { data: null, error: "Konfigurasi Supabase tidak ditemukan." };
  const [st, c, t, s, a, v] = await Promise.all([
    sb.from("time_structures").select("id").eq("academic_year_id", yearId).eq("is_active", true).limit(1),
    sb.from("classes").select("id,name").eq("academic_year_id", yearId).order("name"),
    sb.from("teachers").select("id,name").eq("school_id", schoolId),
    sb.from("subjects").select("id,name,color_token").eq("school_id", schoolId),
    sb.from("teaching_assignments").select("id,teacher_id,subject_id").eq("academic_year_id", yearId),
    sb.from("schedule_versions").select("id,version_no,status").eq("academic_year_id", yearId).order("version_no"),
  ]);
  const err = st.error ?? c.error ?? t.error ?? s.error ?? a.error ?? v.error;
  if (err) return { data: null, error: err.message };
  const sid = st.data?.[0]?.id;
  const versions = (v.data ?? []) as Ver[];
  const active = versions.find((x) => x.status === "ACTIVE") ?? null;
  const working = [...versions].reverse().find((x) => x.status === "DRAFT" || x.status === "PREVIEW") ?? null;
  const viewing = working ?? active;
  const ids = (a.data ?? []).map((x) => x.id);
  const [sl, ac, en] = await Promise.all([
    sid ? sb.from("time_slots").select("id,day_of_week,sequence_no,slot_type,label,starts_at,ends_at,jam_ke").eq("structure_id", sid).order("day_of_week").order("sequence_no") : Promise.resolve({ data: [], error: null }),
    ids.length ? sb.from("teaching_assignment_classes").select("id,teaching_assignment_id,class_id,jp_per_week").in("teaching_assignment_id", ids) : Promise.resolve({ data: [], error: null }),
    viewing ? sb.from("schedule_entries").select("id,class_id,time_slot_id,teaching_assignment_id,teacher_id,subject_id,is_locked").eq("version_id", viewing.id) : Promise.resolve({ data: [], error: null }),
  ]);
  const e2 = sl.error ?? ac.error ?? en.error;
  if (e2) return { data: null, error: e2.message };
  const asg: Asg[] = (a.data ?? []).map((x) => ({
    id: x.id, teacher_id: x.teacher_id, subject_id: x.subject_id,
    classes: (ac.data ?? []).filter((r) => r.teaching_assignment_id === x.id).map((r) => ({ id: r.id, class_id: r.class_id, jp: r.jp_per_week })),
  }));
  return { data: { slots: (sl.data ?? []) as Slot[], classes: c.data ?? [], teachers: t.data ?? [], subjects: s.data ?? [], asg, versions, entries: (en.data ?? []) as Entry[], active, working, viewing }, error: null };
}

export function useCanvasData(schoolId: string | null, yearId: string | null) {
  const [state, setState] = useState<{ data: CanvasData | null; error: string | null; loaded: boolean }>({ data: null, error: null, loaded: false });
  useEffect(() => {
    if (!schoolId || !yearId) return;
    let alive = true;
    fetchCanvas(schoolId, yearId).then((r) => { if (alive) setState({ ...r, loaded: true }); });
    return () => { alive = false; };
  }, [schoolId, yearId]);
  const reload = useCallback(async () => { if (schoolId && yearId) setState({ ...(await fetchCanvas(schoolId, yearId)), loaded: true }); }, [schoolId, yearId]);
  return { ...state, reload };
}
