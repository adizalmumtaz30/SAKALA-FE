"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

export type Opt = { id: string; name: string; grade?: string | null };
export type AC = { id: string; class_id: string; jp: number };
export type Asg = { id: string; teacher_id: string; subject_id: string; classes: AC[] };
export type BebanData = { teachers: Opt[]; subjects: Opt[]; classes: Opt[]; asg: Asg[]; cap: number | null };

export async function fetchBeban(schoolId: string, yearId: string): Promise<{ data: BebanData | null; error: string | null }> {
  const sb = getSupabase();
  if (!sb) return { data: null, error: "Konfigurasi Supabase tidak ditemukan." };
  const [t, s, c, a, st] = await Promise.all([
    sb.from("teachers").select("id,name").eq("school_id", schoolId).order("name"),
    sb.from("subjects").select("id,name").eq("school_id", schoolId).order("name"),
    sb.from("classes").select("id,name,grade").eq("academic_year_id", yearId).order("name"),
    sb.from("teaching_assignments").select("id,teacher_id,subject_id").eq("academic_year_id", yearId),
    sb.from("time_structures").select("id").eq("academic_year_id", yearId).eq("is_active", true).limit(1),
  ]);
  const err = t.error ?? s.error ?? c.error ?? a.error ?? st.error;
  if (err) return { data: null, error: err.message };
  const ids = (a.data ?? []).map((x) => x.id);
  const ac = ids.length ? await sb.from("teaching_assignment_classes").select("id,teaching_assignment_id,class_id,jp_per_week").in("teaching_assignment_id", ids) : { data: [], error: null };
  if (ac.error) return { data: null, error: ac.error.message };
  let cap: number | null = null;
  const sid = st.data?.[0]?.id;
  if (sid) {
    const n = await sb.from("time_slots").select("*", { count: "exact", head: true }).eq("structure_id", sid).eq("slot_type", "TEACHING");
    if (!n.error && (n.count ?? 0) > 0) cap = n.count;
  }
  const asg: Asg[] = (a.data ?? []).map((x) => ({
    id: x.id, teacher_id: x.teacher_id, subject_id: x.subject_id,
    classes: (ac.data ?? []).filter((r) => r.teaching_assignment_id === x.id).map((r) => ({ id: r.id, class_id: r.class_id, jp: r.jp_per_week })),
  }));
  return { data: { teachers: t.data ?? [], subjects: s.data ?? [], classes: c.data ?? [], asg, cap }, error: null };
}

export function useBebanData(schoolId: string | null, yearId: string | null) {
  const [state, setState] = useState<{ data: BebanData | null; error: string | null; loaded: boolean }>({ data: null, error: null, loaded: false });
  useEffect(() => {
    if (!schoolId || !yearId) return;
    let alive = true;
    fetchBeban(schoolId, yearId).then((r) => { if (alive) setState({ ...r, loaded: true }); });
    return () => { alive = false; };
  }, [schoolId, yearId]);
  const reload = useCallback(async () => {
    if (!schoolId || !yearId) return;
    setState({ ...(await fetchBeban(schoolId, yearId)), loaded: true });
  }, [schoolId, yearId]);
  return { ...state, reload };
}
