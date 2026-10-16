"use client";

import { useMemo, useRef, useState } from "react";
import { Lock, LockOpen, Trash2, AlertCircle, AlertTriangle, Plus, CalendarDays, Check, X } from "lucide-react";
import "./canvas.css";
import { getSupabase } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/Dialog";
import { toast, Toaster } from "@/components/ui/toast";
import { useKonteks } from "@/features/konteks/useKonteks";
import { KonteksForm } from "@/features/konteks/KonteksForm";
import { DAYS, hhmm } from "@/features/struktur/logic";
import { useCanvasData, type CanvasData, type Entry } from "./useCanvas";

const nm = (l: { id: string; name: string }[], id: string | null) => l.find((x) => x.id === id)?.name ?? "—";
const tokenVar = (t: string | null | undefined) => {
  const n = Number(String(t ?? "").replace("subject-", ""));
  return n > 0 ? `var(--m${((n - 1) % 12) + 1})` : "var(--ac)";
};

function friendly(e: { code?: string; message: string }) {
  const m = e.message;
  if (m.includes("uq_entry_teacher_slot")) return "Guru sudah mengajar di kelas lain pada jam ini.";
  if (m.includes("uq_entry_room_slot")) return "Ruang sudah dipakai pada jam ini.";
  if (e.code === "23505") return "Slot ini sudah terisi.";
  if (m.includes("SLOT_BUKAN_JAM_PELAJARAN")) return "Slot ini bukan jam pelajaran.";
  if (m.includes("SLOT_BUKAN_STRUKTUR_AKTIF")) return "Slot bukan bagian Struktur Waktu aktif.";
  if (m.includes("KELAS_BUKAN_BEBAN_INI")) return "Kelas ini tidak termasuk dalam beban tersebut.";
  if (e.code === "40001" || m.includes("VERSI_DASAR_BERUBAH")) return "Jadwal aktif sudah berubah. Muat ulang halaman lalu coba lagi.";
  return m;
}

type Cell = { slotId: string; classId: string };
type Sheet = { cell: Cell; entry: Entry | null } | null;

export function Canvas() {
  const k = useKonteks();
  const { data, error, loaded, reload } = useCanvasData(k.schoolId, k.yearId);
  const [day, setDay] = useState(1);
  const [pick, setPick] = useState<string[] | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [confirm, setConfirm] = useState<"apply" | "discard" | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<{ entry: Entry; x: number; y: number; over: { cell: Cell; ok: boolean } | null } | null>(null);
  const press = useRef<{ entry: Entry; sx: number; sy: number; moved: boolean } | null>(null);
  const suppress = useRef(false);

  const classes = useMemo(() => data?.classes ?? [], [data]);
  const shownIds = pick ?? classes.slice(0, 4).map((c) => c.id);
  const shown = classes.filter((c) => shownIds.includes(c.id));
  const daySlots = useMemo(() => (data?.slots ?? []).filter((s) => s.day_of_week === day), [data, day]);

  function cellEntry(d: CanvasData, c: Cell) { return d.entries.find((e) => e.class_id === c.classId && e.time_slot_id === c.slotId) ?? null; }
  function teacherBusy(d: CanvasData, teacherId: string | null, slotId: string, exceptId?: string) {
    return d.entries.find((e) => e.teacher_id === teacherId && e.time_slot_id === slotId && e.id !== exceptId) ?? null;
  }
  function placed(d: CanvasData, asgId: string, classId: string) { return d.entries.filter((e) => e.teaching_assignment_id === asgId && e.class_id === classId).length; }

  async function ensureWorking(d: CanvasData): Promise<string | null> {
    if (d.working) return d.working.id;
    const sb = getSupabase();
    if (!sb || !k.yearId) return null;
    const r = await sb.rpc("create_preview_version", { p_year: k.yearId, p_base: d.active?.id ?? null, p_operation: "MANUAL", p_seed: 0 });
    if (r.error) { toast(friendly(r.error)); return null; }
    return r.data as string;
  }

  async function place(d: CanvasData, asgId: string, c: Cell) {
    const sb = getSupabase(); if (!sb) return;
    setBusy(true);
    const vid = await ensureWorking(d);
    if (!vid) { setBusy(false); return; }
    // Bila draf baru dibuat dari jadwal aktif, entri disalin; sel target dicek ulang lewat penjaga database.
    const r = await sb.from("schedule_entries").insert({ version_id: vid, class_id: c.classId, time_slot_id: c.slotId, teaching_assignment_id: asgId, source: "MANUAL" });
    setBusy(false);
    if (r.error) { toast(friendly(r.error)); await reload(); return; }
    setSheet(null); await reload(); toast("Jam ditempatkan");
  }

  async function changeEntry(d: CanvasData, e: Entry, patch: Partial<{ time_slot_id: string; is_locked: boolean }>, ok: string) {
    const sb = getSupabase(); if (!sb) return;
    setBusy(true);
    const r = await sb.from("schedule_entries").update(patch).eq("id", e.id);
    setBusy(false);
    if (r.error) { toast(friendly(r.error)); return; }
    setSheet(null); await reload(); toast(ok);
  }

  async function removeEntry(e: Entry) {
    const sb = getSupabase(); if (!sb || !data?.viewing) return;
    const r = await sb.from("schedule_entries").delete().eq("id", e.id);
    if (r.error) { toast(friendly(r.error)); return; }
    setSheet(null); await reload();
    toast("Jam dilepas", async () => {
      const b = await sb.from("schedule_entries").insert({ id: e.id, version_id: data.viewing!.id, class_id: e.class_id, time_slot_id: e.time_slot_id, teaching_assignment_id: e.teaching_assignment_id, is_locked: e.is_locked, source: "MANUAL" });
      if (b.error) toast(friendly(b.error)); else { await reload(); toast("Jam dikembalikan"); }
    });
  }

  async function apply(d: CanvasData) {
    const sb = getSupabase(); if (!sb || !d.working) return;
    setBusy(true);
    const r = await sb.rpc("apply_version", { p_version: d.working.id, p_expected_base: d.active?.id ?? null });
    setBusy(false); setConfirm(null);
    if (r.error) { toast(friendly(r.error)); return; }
    await reload(); toast(`Jadwal versi ${d.working.version_no} diterapkan`);
  }
  async function discard(d: CanvasData) {
    const sb = getSupabase(); if (!sb || !d.working) return;
    setBusy(true);
    const r = await sb.from("schedule_versions").delete().eq("id", d.working.id);
    setBusy(false); setConfirm(null);
    if (r.error) { toast(friendly(r.error)); return; }
    await reload(); toast("Draf dibuang");
  }

  // Seret: hanya mouse/pen; sentuhan memakai ketuk lalu lembar aksi.
  function canDrop(d: CanvasData, e: Entry, c: Cell) {
    if (c.classId !== e.class_id || c.slotId === e.time_slot_id) return false;
    if (cellEntry(d, c)) return false;
    return !teacherBusy(d, e.teacher_id, c.slotId, e.id);
  }
  function onDown(ev: React.PointerEvent, e: Entry) {
    if (ev.pointerType === "touch" || ev.button !== 0 || e.is_locked) return;
    press.current = { entry: e, sx: ev.clientX, sy: ev.clientY, moved: false };
    const move = (m: PointerEvent) => {
      const p = press.current; if (!p) return;
      if (!p.moved && Math.hypot(m.clientX - p.sx, m.clientY - p.sy) < 6) return;
      p.moved = true;
      const el = document.elementFromPoint(m.clientX, m.clientY)?.closest<HTMLElement>("[data-cell]");
      const over = el && data ? { cell: { slotId: el.dataset.slot!, classId: el.dataset.class! }, ok: canDrop(data, p.entry, { slotId: el.dataset.slot!, classId: el.dataset.class! }) } : null;
      setDrag({ entry: p.entry, x: m.clientX, y: m.clientY, over });
    };
    const up = async (u: PointerEvent) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      const p = press.current; press.current = null; setDrag(null);
      if (!p?.moved) return;
      suppress.current = true; setTimeout(() => { suppress.current = false; }, 0);
      const el = document.elementFromPoint(u.clientX, u.clientY)?.closest<HTMLElement>("[data-cell]");
      if (!el || !data) return;
      const c = { slotId: el.dataset.slot!, classId: el.dataset.class! };
      if (c.slotId === p.entry.time_slot_id && c.classId === p.entry.class_id) return;
      if (!canDrop(data, p.entry, c)) { toast(c.classId !== p.entry.class_id ? "Jam hanya dapat dipindah dalam kelas yang sama." : cellEntry(data, c) ? "Slot tujuan sudah terisi." : "Guru sudah mengajar di kelas lain pada jam itu."); return; }
      await changeEntry(data, p.entry, { time_slot_id: c.slotId }, "Jam dipindahkan");
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }

  if (k.loading || (k.schoolId && k.yearId && !loaded)) return <section className="card" aria-busy="true"><div className="sk" style={{ width: "40%" }} /><div className="sk" /><div className="sk" /></section>;
  if (k.error || error) return <section className="card"><div className="emp"><AlertCircle aria-hidden /><b>Data tidak dapat dibaca</b><p>{k.error ?? error}</p></div></section>;
  if (!k.schoolId || !k.yearId || !data) return <KonteksForm konteks={k} />;

  const teachingAll = data.slots.filter((s) => s.slot_type === "TEACHING");
  const lack = !teachingAll.length ? "Struktur Waktu belum diatur." : !classes.length ? "Belum ada kelas." : !data.asg.some((a) => a.classes.length) ? "Belum ada beban mengajar." : null;
  const need = data.asg.reduce((s, a) => s + a.classes.reduce((x, c) => x + c.jp, 0), 0);
  const placedAll = data.entries.length;
  const sheetEntry = sheet?.entry ?? null;
  const sheetSlot = sheet ? data.slots.find((s) => s.id === sheet.cell.slotId) : null;

  return (
    <>
      {data.working ? (
        <div className="vb dr" role="status"><span><b>Draf versi {data.working.version_no}</b> · belum diterapkan{data.active ? ` · jadwal aktif: versi ${data.active.version_no}` : ""}</span>
          <span className="row"><button type="button" className="btn t sm" onClick={() => setConfirm("discard")}>Buang Draf</button><button type="button" className="btn f sm" onClick={() => setConfirm("apply")}><Check size={16} aria-hidden />Terapkan</button></span></div>
      ) : data.active ? (
        <div className="vb" role="status"><span><b>Jadwal aktif · versi {data.active.version_no}</b> · mengubah akan membuat draf baru</span></div>
      ) : null}

      <section className="card">
        {lack ? (
          <div className="emp"><CalendarDays aria-hidden /><b>Canvas belum dapat dipakai</b><p>{lack} Lengkapi dulu prasyaratnya di menu Data dan Setting Jadwal.</p></div>
        ) : (
          <>
            <div className="tb">
              <div className="seg" role="group" aria-label="Hari">
                {DAYS.map((d, i) => <button key={d} type="button" aria-pressed={day === i + 1} onClick={() => setDay(i + 1)}>{d.slice(0, 3)}</button>)}
              </div>
              <span style={{ flex: 1 }} />
              <span className="sub num">{placedAll} dari {need} JP terpasang</span>
            </div>
            <div className="cs" role="group" aria-label="Kelas yang ditampilkan (maksimal 4)">
              {classes.map((c) => {
                const on = shownIds.includes(c.id);
                return <label key={c.id}><input type="checkbox" checked={on} disabled={!on && shownIds.length >= 4} onChange={(e) => setPick(e.target.checked ? [...shownIds, c.id] : shownIds.filter((x) => x !== c.id))} />{c.name}</label>;
              })}
            </div>
            {!daySlots.some((s) => s.slot_type === "TEACHING") ? (
              <div className="emp"><CalendarDays aria-hidden /><b>{DAYS[day - 1]} tidak memiliki jam pelajaran</b><p>Atur slot hari ini di Setting Jadwal.</p></div>
            ) : (
              <div className="mx">
                <div className="mg" style={{ gridTemplateColumns: `72px repeat(${shown.length}, minmax(140px, 1fr))` }}>
                  <div className="mh" />
                  {shown.map((c) => <div key={c.id} className="mh">{c.name}</div>)}
                  {daySlots.map((s) => s.slot_type !== "TEACHING" ? (
                    <div key={s.id} className="mb">{s.label || (s.slot_type === "BREAK" ? "Istirahat" : "Kegiatan")} · {hhmm(s.starts_at)}–{hhmm(s.ends_at)}</div>
                  ) : (
                    <div key={s.id} style={{ display: "contents" }}>
                      <div className="mt"><b>{s.jam_ke}</b>{hhmm(s.starts_at)}</div>
                      {shown.map((c) => {
                        const cell = { slotId: s.id, classId: c.id };
                        const e = cellEntry(data, cell);
                        const ov = drag?.over && drag.over.cell.slotId === s.id && drag.over.cell.classId === c.id ? (drag.over.ok ? "ok" : "no") : "";
                        const cn = `cell ${e ? "fl2" : ""} ${e?.is_locked ? "lk" : ""} ${ov} ${drag?.entry.id === e?.id && e ? "dragging" : ""}`;
                        return (
                          <button key={c.id} type="button" className={cn} data-cell data-slot={s.id} data-class={c.id}
                            style={e ? { ["--c" as string]: tokenVar(data.subjects.find((x) => x.id === e.subject_id)?.color_token) } : undefined}
                            aria-label={e ? `${nm(data.subjects, e.subject_id)}, ${nm(data.teachers, e.teacher_id)}, kelas ${c.name}, jam ke-${s.jam_ke}${e.is_locked ? ", terkunci" : ""}` : `Kosong, kelas ${c.name}, jam ke-${s.jam_ke}`}
                            onPointerDown={e ? (ev) => onDown(ev, e) : undefined}
                            onClick={() => { if (suppress.current) return; setSheet({ cell, entry: e }); }}>
                            {e ? (<><b>{nm(data.subjects, e.subject_id)}</b><small>{nm(data.teachers, e.teacher_id)}</small>{e.is_locked && <Lock size={14} aria-hidden />}</>) : <Plus size={16} aria-hidden />}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <div className="ct"><span>Seret jam ke slot kosong (mouse), atau ketuk sel untuk menempatkan, memindahkan, mengunci.</span><span>Tahun ajaran {k.yearName}</span></div>
      </section>

      {drag && <div className="ghost" style={{ left: drag.x + 12, top: drag.y + 12 }}>{nm(data.subjects, drag.entry.subject_id)}</div>}

      {sheet && sheetSlot && (
        <Dialog title={sheetEntry ? "Detail jam" : "Tempatkan jam"} onClose={() => setSheet(null)}>
          <div className="sub">Kelas {nm(classes, sheet.cell.classId)} · {DAYS[sheetSlot.day_of_week - 1]} · Jam ke-{sheetSlot.jam_ke} ({hhmm(sheetSlot.starts_at)}–{hhmm(sheetSlot.ends_at)})</div>
          {sheetEntry ? (
            <>
              <div style={{ margin: "12px 0" }}><b>{nm(data.subjects, sheetEntry.subject_id)}</b><div className="sub">{nm(data.teachers, sheetEntry.teacher_id)}</div>{sheetEntry.is_locked && <div className="chip wn" style={{ marginTop: 8 }}><Lock aria-hidden />Terkunci</div>}</div>
              {!sheetEntry.is_locked && (
                <label className="fl"><span>Pindahkan ke jam</span>
                  <select aria-label="Pindahkan ke jam" value="" onChange={(ev) => ev.target.value && changeEntry(data, sheetEntry, { time_slot_id: ev.target.value }, "Jam dipindahkan")}>
                    <option value="">Pilih jam kosong</option>
                    {daySlots.filter((s) => s.slot_type === "TEACHING" && s.id !== sheetEntry.time_slot_id && canDrop(data, sheetEntry, { slotId: s.id, classId: sheetEntry.class_id })).map((s) => <option key={s.id} value={s.id}>Jam ke-{s.jam_ke} · {hhmm(s.starts_at)}–{hhmm(s.ends_at)}</option>)}
                  </select>
                </label>
              )}
              <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
                <button type="button" className="btn t" onClick={() => changeEntry(data, sheetEntry, { is_locked: !sheetEntry.is_locked }, sheetEntry.is_locked ? "Kunci dibuka" : "Jam dikunci")}>{sheetEntry.is_locked ? <LockOpen size={18} aria-hidden /> : <Lock size={18} aria-hidden />}{sheetEntry.is_locked ? "Buka Kunci" : "Kunci"}</button>
                <button type="button" className="btn dn" disabled={sheetEntry.is_locked} onClick={() => removeEntry(sheetEntry)}><Trash2 size={18} aria-hidden />Lepas</button>
              </div>
              {sheetEntry.is_locked && <p className="sub" style={{ marginTop: 8 }}>Buka kunci terlebih dahulu untuk memindahkan atau melepas.</p>}
            </>
          ) : (
            <div style={{ marginTop: 8 }}>
              {data.asg.filter((a) => a.classes.some((c) => c.class_id === sheet.cell.classId)).map((a) => {
                const jp = a.classes.find((c) => c.class_id === sheet.cell.classId)!.jp;
                const got = placed(data, a.id, sheet.cell.classId);
                const busyE = teacherBusy(data, a.teacher_id, sheet.cell.slotId);
                const reason = got >= jp ? "JP mapel di kelas ini sudah terpenuhi." : busyE ? `Guru sedang mengajar di kelas ${nm(classes, busyE.class_id)} pada jam ini.` : null;
                return (
                  <div key={a.id} className="cand">
                    <div><b>{nm(data.subjects, a.subject_id)}</b><div className="sub">{nm(data.teachers, a.teacher_id)} · terpasang {got}/{jp} JP</div></div>
                    <button type="button" className="btn t sm" disabled={Boolean(reason) || busy} onClick={() => place(data, a.id, sheet.cell)}><Plus size={16} aria-hidden />Tempatkan</button>
                    {reason && <div className="dgn wn" style={{ gridColumn: "1 / -1" }}><AlertTriangle size={16} aria-hidden /><span>{reason}</span></div>}
                  </div>
                );
              })}
              {!data.asg.some((a) => a.classes.some((c) => c.class_id === sheet.cell.classId)) && <div className="emp"><b>Kelas ini belum punya beban</b><p>Tambahkan di Beban Mengajar.</p></div>}
            </div>
          )}
        </Dialog>
      )}

      {confirm && data.working && (
        <Dialog title={confirm === "apply" ? `Terapkan versi ${data.working.version_no}?` : "Buang draf?"} onClose={() => setConfirm(null)}>
          {confirm === "apply" ? (
            <>
              <p className="sub" style={{ margin: "8px 0" }}>{data.active ? `Menggantikan jadwal aktif versi ${data.active.version_no}, yang diarsipkan.` : "Ini menjadi jadwal aktif pertama."}</p>
              <p className="sub">{placedAll} dari {need} JP terpasang{placedAll < need ? `, ${need - placedAll} JP belum ditempatkan` : ""}.</p>
            </>
          ) : <p className="sub" style={{ margin: "8px 0" }}>Semua perubahan pada draf ini hilang. Jadwal aktif tidak berubah.</p>}
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
            <button type="button" className="btn t" onClick={() => setConfirm(null)}><X size={18} aria-hidden />Batal</button>
            {confirm === "apply" ? <button type="button" className="btn f" disabled={busy} onClick={() => apply(data)}><Check size={18} aria-hidden />Terapkan</button> : <button type="button" className="btn dn" disabled={busy} onClick={() => discard(data)}><Trash2 size={18} aria-hidden />Buang</button>}
          </div>
        </Dialog>
      )}
      <Toaster />
    </>
  );
}
