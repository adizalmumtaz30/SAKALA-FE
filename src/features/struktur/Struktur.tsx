"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Save, AlertCircle, AlertTriangle, Wand2, Copy, Clock } from "lucide-react";
import "./struktur.css";
import { getSupabase } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/Dialog";
import { toast, Toaster } from "@/components/ui/toast";
import { useKonteks } from "@/features/konteks/useKonteks";
import { KonteksForm } from "@/features/konteks/KonteksForm";
import { useStruktur, type StrukturData } from "./useStruktur";
import { DAYS, TYPE_LABEL, countTeaching, generate, hhmm, overlaps, seqOf, toMin, type Draft, type Slot, type SlotType } from "./logic";

const cls = (t: SlotType) => (t === "TEACHING" ? "t" : t === "BREAK" ? "b" : "a");

export function Struktur() {
  const k = useKonteks();
  const { data, error, loaded, reload } = useStruktur(k.yearId);
  const [day, setDay] = useState(1);
  const [dlg, setDlg] = useState<null | "pola" | "salin" | { slot: Slot | null }>(null);

  async function ensureStructure(): Promise<string | null> {
    if (data?.structureId) return data.structureId;
    const sb = getSupabase();
    if (!sb || !k.yearId) return null;
    const r = await sb.from("time_structures").insert({ academic_year_id: k.yearId, name: "Reguler", is_active: true }).select("id").single();
    return r.error ? null : r.data.id;
  }

  // Ganti seluruh slot pada hari-hari tertentu. Diblokir bila ada jadwal yang memakai slot lama.
  async function replaceDays(days: number[], build: (d: number) => Draft[]): Promise<string | null> {
    const sb = getSupabase();
    if (!sb) return "Konfigurasi Supabase tidak ditemukan.";
    const sid = await ensureStructure();
    if (!sid) return "Struktur Waktu tidak dapat dibuat.";
    const old = (data?.slots ?? []).filter((s) => days.includes(s.day_of_week));
    if (old.length) {
      const u = await sb.from("schedule_entries").select("*", { count: "exact", head: true }).in("time_slot_id", old.map((s) => s.id));
      if ((u.count ?? 0) > 0) return `Tidak dapat diganti: ${u.count} jam di jadwal memakai slot hari tersebut.`;
      const d = await sb.from("time_slots").delete().in("id", old.map((s) => s.id));
      if (d.error) return d.error.message;
    }
    const rows = days.flatMap((d) => build(d).map((x) => ({ structure_id: sid, day_of_week: d, sequence_no: seqOf(x.starts_at), slot_type: x.slot_type, label: x.label, starts_at: x.starts_at, ends_at: x.ends_at })));
    if (rows.length) {
      const i = await sb.from("time_slots").insert(rows);
      if (i.error) return i.error.message;
    }
    await reload();
    return null;
  }

  async function removeSlot(s: Slot) {
    const sb = getSupabase();
    if (!sb) return;
    const u = await sb.from("schedule_entries").select("*", { count: "exact", head: true }).eq("time_slot_id", s.id);
    if ((u.count ?? 0) > 0) { toast(`Tidak dapat dihapus: dipakai pada ${u.count} jam di jadwal.`); return; }
    const r = await sb.from("time_slots").delete().eq("id", s.id);
    if (r.error) { toast(`Gagal menghapus: ${r.error.message}`); return; }
    await reload();
    toast("Slot dihapus", async () => {
      const b = await sb.from("time_slots").insert({ id: s.id, structure_id: data?.structureId, day_of_week: s.day_of_week, sequence_no: s.sequence_no, slot_type: s.slot_type, label: s.label, starts_at: s.starts_at, ends_at: s.ends_at });
      if (b.error) toast(`Gagal mengurungkan: ${b.error.message}`); else { await reload(); toast("Slot dikembalikan"); }
    });
  }

  const slots = useMemo(() => data?.slots ?? [], [data]);
  const perDay = useMemo(() => DAYS.map((_, i) => slots.filter((s) => s.day_of_week === i + 1)), [slots]);
  const cap = countTeaching(slots);

  if (k.loading || (k.yearId && !loaded)) return <section className="card" aria-busy="true"><div className="sk" style={{ width: "40%" }} /><div className="sk" /><div className="sk" /></section>;
  if (k.error || error) return <section className="card"><div className="emp"><AlertCircle aria-hidden /><b>Data tidak dapat dibaca</b><p>{k.error ?? error}</p></div></section>;
  if (!k.schoolId || !k.yearId || !data) return <KonteksForm konteks={k} />;

  const list = perDay[day - 1];

  return (
    <>
      <div className="cp">
        <div className="card"><span className="sub">Kapasitas per kelas</span><b>{cap}</b><span className="sub">JP per minggu</span></div>
        <div className="card"><span className="sub">Hari terisi</span><b>{perDay.filter((d) => d.length).length}</b><span className="sub">dari {DAYS.length} hari</span></div>
        <div className="card"><span className="sub">Jam pelajaran {DAYS[day - 1]}</span><b>{countTeaching(list)}</b><span className="sub">JP</span></div>
      </div>

      <section className="card">
        <div className="tb">
          <div className="seg" role="group" aria-label="Hari">
            {DAYS.map((d, i) => <button key={d} type="button" aria-pressed={day === i + 1} onClick={() => setDay(i + 1)}>{d.slice(0, 3)}</button>)}
          </div>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn t" onClick={() => setDlg("pola")}><Wand2 size={18} aria-hidden />Pola Cepat</button>
          <button type="button" className="btn t" disabled={!list.length} onClick={() => setDlg("salin")}><Copy size={18} aria-hidden />Salin Hari</button>
          <button type="button" className="btn f" onClick={() => setDlg({ slot: null })}><Plus size={18} aria-hidden />Tambah Slot</button>
        </div>

        {!list.length && (
          <div className="emp"><Clock aria-hidden /><b>{DAYS[day - 1]} belum memiliki slot</b>
            <p>Gunakan Pola Cepat untuk membuat jam pelajaran dan istirahat sekaligus, atau tambah slot satu per satu.</p>
            <button type="button" className="btn t sm" onClick={() => setDlg("pola")}><Wand2 size={16} aria-hidden />Pola Cepat</button></div>
        )}

        {list.map((s) => (
          <div key={s.id} className="sl">
            <div className={`jk ${s.slot_type === "TEACHING" ? "" : "dim"}`} aria-label={s.slot_type === "TEACHING" ? `Jam ke-${s.jam_ke}` : TYPE_LABEL[s.slot_type]}>{s.slot_type === "TEACHING" ? s.jam_ke : "—"}</div>
            <div><b className="num">{hhmm(s.starts_at)}–{hhmm(s.ends_at)}</b><div className="sub">{s.label || (s.slot_type === "TEACHING" ? `Jam ke-${s.jam_ke}` : TYPE_LABEL[s.slot_type])} · {toMin(s.ends_at) - toMin(s.starts_at)} menit</div></div>
            <span className={`ty ${cls(s.slot_type)}`}>{TYPE_LABEL[s.slot_type]}</span>
            <div className="acts">
              <button type="button" className="btn t ib" aria-label={`Ubah slot ${hhmm(s.starts_at)}`} onClick={() => setDlg({ slot: s })}><Pencil size={16} aria-hidden /></button>
              <button type="button" className="btn t ib dng" aria-label={`Hapus slot ${hhmm(s.starts_at)}`} onClick={() => removeSlot(s)}><Trash2 size={16} aria-hidden /></button>
            </div>
          </div>
        ))}
        <div className="ct"><span>Jam ke- dihitung otomatis dari urutan slot Pelajaran.</span><span>Tahun ajaran {k.yearName}</span></div>
      </section>

      {dlg === "pola" && <PolaForm data={data} day={day} onClose={() => setDlg(null)} onApply={async (days, b) => { const m = await replaceDays(days, () => b); if (!m) { setDlg(null); toast("Pola diterapkan"); } return m; }} />}
      {dlg === "salin" && <SalinForm data={data} from={day} onClose={() => setDlg(null)} onApply={async (days) => { const src = perDay[day - 1]; const m = await replaceDays(days, () => src.map((s) => ({ slot_type: s.slot_type, label: s.label, starts_at: hhmm(s.starts_at), ends_at: hhmm(s.ends_at) }))); if (!m) { setDlg(null); toast("Hari disalin"); } return m; }} />}
      {dlg && typeof dlg === "object" && <SlotForm slot={dlg.slot} day={day} list={list} onClose={() => setDlg(null)} onSave={async (d) => {
        const sb = getSupabase(); const sid = await ensureStructure();
        if (!sb || !sid) return "Struktur Waktu tidak dapat dibuat.";
        const row = { structure_id: sid, day_of_week: day, sequence_no: seqOf(d.starts_at), slot_type: d.slot_type, label: d.label, starts_at: d.starts_at, ends_at: d.ends_at };
        const r = dlg.slot ? await sb.from("time_slots").update(row).eq("id", dlg.slot.id) : await sb.from("time_slots").insert(row);
        if (r.error) return r.error.code === "23505" ? "Sudah ada slot dengan jam mulai yang sama." : r.error.message;
        await reload(); setDlg(null); toast(dlg.slot ? "Slot diperbarui" : "Slot ditambahkan"); return null;
      }} />}
      <Toaster />
    </>
  );
}

function Impact({ data, removeTeaching, addTeaching, days }: { data: StrukturData; removeTeaching: number; addTeaching: number; days: number[] }) {
  const cur = countTeaching(data.slots);
  const next = cur - removeTeaching + addTeaching;
  const over = data.classTotals.filter((c) => c.jp > next);
  const oldSlots = data.slots.filter((s) => days.includes(s.day_of_week)).length;
  return (
    <div style={{ marginTop: 8 }}>
      <div className="sub">Kapasitas mingguan: <b className="num" style={{ color: "var(--t1)" }}>{cur}</b> → <b className="num" style={{ color: "var(--t1)" }}>{next}</b> JP{oldSlots ? ` · mengganti ${oldSlots} slot lama` : ""}</div>
      {over.length > 0 && <div className="dgn wn"><AlertTriangle size={16} aria-hidden /><span>{over.length} kelas memiliki beban melebihi kapasitas baru ({over.slice(0, 4).map((c) => `${c.name}: ${c.jp} JP`).join(", ")}{over.length > 4 ? ", …" : ""}). Atur ulang Beban Mengajar setelahnya.</span></div>}
    </div>
  );
}

function PolaForm({ data, day, onClose, onApply }: { data: StrukturData; day: number; onClose: () => void; onApply: (days: number[], b: Draft[]) => Promise<string | null> }) {
  const [v, setV] = useState({ start: "07:00", dur: "40", count: "8", a1: "3", m1: "15", a2: "6", m2: "30" });
  const [days, setDays] = useState<number[]>([day]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dur = Number(v.dur), count = Number(v.count);
  const valid = Number.isInteger(dur) && dur >= 10 && dur <= 120 && Number.isInteger(count) && count >= 1 && count <= 16 && /^\d{2}:\d{2}$/.test(v.start);
  const draft = useMemo(() => valid ? generate(v.start, dur, count, [{ after: Number(v.a1), min: Number(v.m1) || 0 }, { after: Number(v.a2), min: Number(v.m2) || 0 }].filter((b) => b.after > 0)) : [], [v, valid, dur, count]);
  const t = countTeaching(draft);
  const oldT = data.slots.filter((s) => days.includes(s.day_of_week) && s.slot_type === "TEACHING").length;
  const end = draft.length ? draft[draft.length - 1].ends_at : "";

  async function go() {
    if (!valid) { setErr("Periksa isian: durasi 10–120 menit, jumlah JP 1–16, jam mulai HH:MM."); return; }
    if (!days.length) { setErr("Pilih minimal satu hari."); return; }
    setBusy(true); setErr(null);
    const m = await onApply(days, draft);
    if (m) setErr(m);
    setBusy(false);
  }
  const f = (key: keyof typeof v, label: string, type = "text") => <label className="fl"><span>{label}</span><input type={type} value={v[key]} onChange={(e) => setV({ ...v, [key]: e.target.value })} /></label>;
  return (
    <Dialog title="Pola Cepat" onClose={onClose} wide>
      <div className="sub" style={{ marginBottom: 8 }}>Buat jam pelajaran dan istirahat sekaligus, lalu terapkan ke hari yang dipilih.</div>
      <div className="row2">{f("start", "Jam mulai", "time")}{f("dur", "Durasi 1 JP (menit)", "number")}</div>
      <div className="row2">{f("count", "Jumlah JP per hari", "number")}<span /></div>
      <div className="row2">{f("a1", "Istirahat 1 setelah JP ke-", "number")}{f("m1", "Lama (menit)", "number")}</div>
      <div className="row2">{f("a2", "Istirahat 2 setelah JP ke- (opsional)", "number")}{f("m2", "Lama (menit)", "number")}</div>
      <div className="sub" style={{ fontWeight: 500, marginBottom: 6 }}>Terapkan ke hari</div>
      <div className="chk" role="group" aria-label="Hari">
        {DAYS.map((d, i) => <label key={d}><input type="checkbox" checked={days.includes(i + 1)} onChange={(e) => setDays((p) => e.target.checked ? [...p, i + 1] : p.filter((x) => x !== i + 1))} />{d.slice(0, 3)}</label>)}
      </div>
      {draft.length > 0 && <div className="pv num" aria-label="Pratinjau">{draft.map((d, i) => <div key={i}>{d.starts_at}–{d.ends_at} · {d.slot_type === "TEACHING" ? `Jam ke-${draft.slice(0, i + 1).filter((x) => x.slot_type === "TEACHING").length}` : d.label}</div>)}<div className="sub">{t} JP · selesai {end}</div></div>}
      <Impact data={data} removeTeaching={oldT} addTeaching={t * days.length} days={days} />
      {err && <div role="alert" className="em" style={{ marginTop: 10 }}><AlertCircle size={16} aria-hidden />{err}</div>}
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 20 }}>
        <button type="button" className="btn t" onClick={onClose}>Batal</button>
        <button type="button" className="btn f" disabled={busy} onClick={go}><Wand2 size={18} aria-hidden />{busy ? "Menerapkan…" : "Terapkan"}</button>
      </div>
    </Dialog>
  );
}

function SalinForm({ data, from, onClose, onApply }: { data: StrukturData; from: number; onClose: () => void; onApply: (days: number[]) => Promise<string | null> }) {
  const [days, setDays] = useState<number[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const src = data.slots.filter((s) => s.day_of_week === from);
  const oldT = data.slots.filter((s) => days.includes(s.day_of_week) && s.slot_type === "TEACHING").length;
  async function go() {
    if (!days.length) { setErr("Pilih minimal satu hari tujuan."); return; }
    setBusy(true); setErr(null);
    const m = await onApply(days);
    if (m) setErr(m);
    setBusy(false);
  }
  return (
    <Dialog title={`Salin ${DAYS[from - 1]}`} onClose={onClose}>
      <div className="sub" style={{ marginBottom: 12 }}>Seluruh slot {DAYS[from - 1]} ({src.length} slot, {countTeaching(src)} JP) disalin ke hari tujuan dan menggantikan slot yang ada.</div>
      <div className="chk" role="group" aria-label="Hari tujuan">
        {DAYS.map((d, i) => i + 1 === from ? null : <label key={d}><input type="checkbox" checked={days.includes(i + 1)} onChange={(e) => setDays((p) => e.target.checked ? [...p, i + 1] : p.filter((x) => x !== i + 1))} />{d.slice(0, 3)}</label>)}
      </div>
      <Impact data={data} removeTeaching={oldT} addTeaching={countTeaching(src) * days.length} days={days} />
      {err && <div role="alert" className="em" style={{ marginTop: 10 }}><AlertCircle size={16} aria-hidden />{err}</div>}
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 20 }}>
        <button type="button" className="btn t" onClick={onClose}>Batal</button>
        <button type="button" className="btn f" disabled={busy} onClick={go}><Copy size={18} aria-hidden />{busy ? "Menyalin…" : "Salin"}</button>
      </div>
    </Dialog>
  );
}

function SlotForm({ slot, day, list, onClose, onSave }: { slot: Slot | null; day: number; list: Slot[]; onClose: () => void; onSave: (d: Draft) => Promise<string | null> }) {
  const [type, setType] = useState<SlotType>(slot?.slot_type ?? "TEACHING");
  const [label, setLabel] = useState(slot?.label ?? "");
  const [start, setStart] = useState(slot ? hhmm(slot.starts_at) : "");
  const [end, setEnd] = useState(slot ? hhmm(slot.ends_at) : "");
  const [err, setErr] = useState<{ time?: string; top?: string }>({});
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) { setErr({ time: "Jam mulai dan selesai wajib diisi." }); return; }
    if (toMin(end) <= toMin(start)) { setErr({ time: "Jam selesai harus setelah jam mulai." }); return; }
    if (overlaps(list.filter((s) => s.id !== slot?.id), { starts_at: start, ends_at: end })) { setErr({ time: "Waktu tumpang tindih dengan slot lain di hari ini." }); return; }
    setBusy(true); setErr({});
    const m = await onSave({ slot_type: type, label: label.trim() || null, starts_at: start, ends_at: end });
    if (m) setErr({ top: m });
    setBusy(false);
  }
  return (
    <Dialog title={`${slot ? "Ubah" : "Tambah"} Slot · ${DAYS[day - 1]}`} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <label className="fl"><span>Jenis</span>
          <select id="s-type" value={type} onChange={(e) => setType(e.target.value as SlotType)}>{(Object.keys(TYPE_LABEL) as SlotType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select>
        </label>
        <div className="row2">
          <label className="fl"><span>Jam mulai *</span><input id="s-start" type="time" value={start} aria-invalid={Boolean(err.time)} onChange={(e) => setStart(e.target.value)} /></label>
          <label className="fl"><span>Jam selesai *</span><input id="s-end" type="time" value={end} aria-invalid={Boolean(err.time)} onChange={(e) => setEnd(e.target.value)} /></label>
        </div>
        {err.time && <div role="alert" className="em" style={{ marginTop: -6, marginBottom: 12 }}><AlertCircle size={16} aria-hidden />{err.time}</div>}
        <label className="fl"><span>Label (opsional)</span><input id="s-label" value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} placeholder={type === "TEACHING" ? "Kosongkan untuk “Jam ke-N”" : "Contoh: Istirahat"} /></label>
        {err.top && <div role="alert" className="em"><AlertCircle size={16} aria-hidden />{err.top}</div>}
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 20 }}>
          <button type="button" className="btn t" onClick={onClose}>Batal</button>
          <button type="submit" className="btn f" disabled={busy}><Save size={18} aria-hidden />{busy ? "Menyimpan…" : "Simpan Perubahan"}</button>
        </div>
      </form>
    </Dialog>
  );
}
