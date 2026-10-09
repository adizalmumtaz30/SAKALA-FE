"use client";

import { useState } from "react";
import { School } from "lucide-react";
import { useKonteks } from "./useKonteks";

export function KonteksForm({ konteks }: { konteks: ReturnType<typeof useKonteks> }) {
  const [sekolah, setSekolah] = useState(konteks.schoolName ?? "");
  const [tahun, setTahun] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sekolah.trim() || !tahun.trim()) { setErr("Nama sekolah dan tahun ajaran wajib diisi."); return; }
    setBusy(true); setErr(null);
    const m = await konteks.siapkan(sekolah.trim(), tahun.trim());
    if (m) setErr(m);
    setBusy(false);
  }

  return (
    <section className="card">
      <div className="emp">
        <School aria-hidden />
        <b>Siapkan sekolah dan tahun ajaran</b>
        <p>Data guru, mapel, dan kelas disimpan per tahun ajaran. Isi sekali, lalu semua modul siap dipakai.</p>
      </div>
      <form onSubmit={submit} style={{ display: "grid", gap: 14, maxWidth: 440, margin: "0 auto" }}>
        {!konteks.schoolId && (
          <label className="fl"><span>Nama sekolah</span><input value={sekolah} onChange={(e) => setSekolah(e.target.value)} maxLength={80} placeholder="Contoh: MTs Contoh Nusantara" /></label>
        )}
        <label className="fl"><span>Tahun ajaran</span><input value={tahun} onChange={(e) => setTahun(e.target.value)} maxLength={20} placeholder="Contoh: 2026/2027" /></label>
        {err && <div role="alert" className="er" style={{ fontSize: 13 }}>{err}</div>}
        <button type="submit" className="btn f" disabled={busy}>{busy ? "Menyimpan…" : "Simpan"}</button>
        <p className="sub" style={{ textAlign: "center" }}>Mode Pengembangan: pakai data uji saja.</p>
      </form>
    </section>
  );
}
