"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

export type Konteks = {
  loading: boolean;
  error: string | null;
  schoolId: string | null;
  schoolName: string | null;
  yearId: string | null;
  yearName: string | null;
};
const EMPTY: Konteks = { loading: true, error: null, schoolId: null, schoolName: null, yearId: null, yearName: null };

async function fetchKonteks(): Promise<Konteks> {
  const sb = getSupabase();
  if (!sb) return { ...EMPTY, loading: false, error: "Konfigurasi Supabase tidak ditemukan." };
  const sch = await sb.from("schools").select("id,name").order("created_at", { ascending: true }).limit(1);
  if (sch.error) return { ...EMPTY, loading: false, error: sch.error.message };
  const school = sch.data?.[0];
  if (!school) return { ...EMPTY, loading: false };
  const yrs = await sb.from("academic_years").select("id,name,status,created_at").eq("school_id", school.id).order("created_at", { ascending: false });
  if (yrs.error) return { ...EMPTY, loading: false, error: yrs.error.message };
  const year = yrs.data?.find((y) => y.status === "ACTIVE") ?? yrs.data?.[0];
  return { loading: false, error: null, schoolId: school.id, schoolName: school.name, yearId: year?.id ?? null, yearName: year?.name ?? null };
}

export function useKonteks() {
  const [k, setK] = useState<Konteks>(EMPTY);
  useEffect(() => {
    let alive = true;
    fetchKonteks().then((r) => { if (alive) setK(r); });
    return () => { alive = false; };
  }, []);
  const refresh = useCallback(async () => setK(await fetchKonteks()), []);

  const siapkan = useCallback(async (schoolName: string, yearName: string) => {
    const sb = getSupabase();
    if (!sb) return "Konfigurasi Supabase tidak ditemukan.";
    let { schoolId } = k;
    if (!schoolId) {
      const s = await sb.from("schools").insert({ name: schoolName }).select("id").single();
      if (s.error) return s.error.message;
      schoolId = s.data.id;
    }
    const y = await sb.from("academic_years").insert({ school_id: schoolId, name: yearName, status: "ACTIVE" });
    if (y.error) return y.error.message;
    await refresh();
    return null;
  }, [k, refresh]);

  return { ...k, refresh, siapkan };
}
