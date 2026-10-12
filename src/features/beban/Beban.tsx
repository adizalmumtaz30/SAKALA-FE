"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Save, AlertCircle, AlertTriangle, Inbox } from "lucide-react";
import "./beban.css";
import { getSupabase } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/Dialog";
import { toast, Toaster } from "@/components/ui/toast";
import { useKonteks } from "@/features/konteks/useKonteks";
import { KonteksForm } from "@/features/konteks/KonteksForm";
import { useBebanData, type Asg, type BebanData } from "./useBeban";

const nm = (l: { id: string; name: string }[], id: string) => l.find((x) => x.id === id)?.name ?? "—";

export function Beban() {
  const k = useKonteks();
  const { data, error, loaded, reload } = useBebanData(k.schoolId, k.yearId);
  const [view, setView] = useState<"guru" | "kelas">("guru");
  const [edit, setEdit] = useState<Asg | "new" | null>(null);

  const classTotal = useMemo(() => {
    const m = new Map<string, number>();
    data?.asg.forEach((a) => a.classes.forEach((c) => m.set(c.class_id, (m.get(c.class_id) ?? 0) + c.jp)));
    return m;
  }, [data]);

  async function removeRow(a: Asg, rowId: string) {
    const sb = getSupabase();
    const row = a.classes.find((c) => c.id === rowId);
    if (!sb || !row) return;
    const used = await sb.from("schedule_entries").select("*", { count: "exact", head: true }).eq("teaching_assignment_id", a.id).eq("class_id", row.class_id);
    if ((used.count ?? 0) > 0) { toast(`Tidak dapat dihapus: dipakai pada ${used.count} jam di jadwal.`); return; }
    const last = a.classes.length === 1;
    const d1 = await sb.from("teaching_assignment_classes").delete().eq("id", row.id);
    if (d1.error) { toast(`Gagal menghapus: ${d1.error.message}`); return; }
    if (last) {
      const d2 = await sb.from("teaching_assignments").delete().eq("id", a.id);
      if (d2.error) { toast(`Gagal menghapus: ${d2.error.message}`); return; }
    }
    await reload();
    toast("Beban dihapus", async () => {
      if (last) await sb.from("teaching_assignments").insert({ id: a.id, academic_year_id: k.yearId, teacher_id: a.teacher_id, subject_id: a.subject_id });
      const b = await sb.from("teaching_assignment_classes").insert({ id: row.id, teaching_assignment_id: a.id, class_id: row.class_id, jp_per_week: row.jp });
      if (b.error) toast(`Gagal mengurungkan: ${b.error.message}`); else { await reload(); toast("Beban dikembalikan"); }
    });
  }

  if (k.loading || (k.schoolId && k.yearId && !loaded)) return <section className="card" aria-busy="true"><div className="sk" style={{ width: "40%" }} /><div className="sk" /><div className="sk" /></section>;
  if (k.error || error) return <section className="card"><div className="emp"><AlertCircle aria-hidden /><b>Data tidak dapat dibaca</b><p>{k.error ?? error}</p></div></section>;
  if (!k.schoolId || !k.yearId || !data) return <KonteksForm konteks={k} />;

  const used = new Set(data.asg.filter((a) => a.classes.length).map((a) => a.teacher_id));
  const totalJp = [...classTotal.values()].reduce((x, y) => x + y, 0);
  const needs = data.teachers.length === 0 || data.subjects.length === 0 || data.classes.length === 0;

  return (
    <>
      <div className="sum">
        <div className="card"><span className="sub">Beban mengajar</span><b>{data.asg.filter((a) => a.classes.length).length}</b></div>
        <div className="card"><span className="sub">Total JP per minggu</span><b>{totalJp}</b></div>
        <div className="card"><span className="sub">Guru tanpa beban</span><b>{data.teachers.filter((t) => !used.has(t.id)).length}</b></div>
        <div className="card"><span className="sub">Kelas tanpa beban</span><b>{data.classes.filter((c) => !classTotal.has(c.id)).length}</b></div>
      </div>

      <section className="card">
        <div className="tb">
          <div className="seg" role="group" aria-label="Tampilan">
            <button type="button" aria-pressed={view === "guru"} onClick={() => setView("guru")}>Per Guru</button>
            <button type="button" aria-pressed={view === "kelas"} onClick={() => setView("kelas")}>Per Kelas</button>
          </div>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn f" disabled={needs} onClick={() => setEdit("new")}><Plus size={18} aria-hidden />Tambah Beban</button>
        </div>

        {needs && (
          <div className="emp"><Inbox aria-hidden /><b>Data inti belum lengkap</b>
            <p>Beban mengajar memerlukan minimal satu guru, satu mapel, dan satu kelas.</p></div>
        )}
        {!needs && data.asg.length === 0 && (
          <div className="emp"><Inbox aria-hidden /><b>Belum ada beban mengajar</b><p>Pilih guru dan mapel, lalu tandai kelas beserta JP per minggu.</p>
            <button type="button" className="btn t sm" onClick={() => setEdit("new")}><Plus size={16} aria-hidden />Tambah Beban</button></div>
        )}

        {view === "guru" && data.teachers.map((t) => {
          const list = data.asg.filter((a) => a.teacher_id === t.id && a.classes.length);
          if (!list.length) return null;
          const jp = list.reduce((s, a) => s + a.classes.reduce((x, c) => x + c.jp, 0), 0);
          return (
            <div key={t.id} className="grp">
              <div className="grp-h2"><b>{t.name}</b><span className="sub num">{jp} JP / minggu</span></div>
              {list.flatMap((a) => a.classes.map((c) => (
                <div key={c.id} className="br">
                  <div><b>{nm(data.subjects, a.subject_id)}</b><div className="sub">Kelas {nm(data.classes, c.class_id)}</div></div>
                  <span className="num">{c.jp} JP</span>
                  <div className="acts">
                    <button type="button" className="btn t ib" aria-label={`Ubah beban ${t.name} ${nm(data.subjects, a.subject_id)}`} onClick={() => setEdit(a)}><Pencil size={16} aria-hidden /></button>
                    <button type="button" className="btn t ib dng" aria-label={`Hapus ${nm(data.subjects, a.subject_id)} kelas ${nm(data.classes, c.class_id)} dari ${t.name}`} onClick={() => removeRow(a, c.id)}><Trash2 size={16} aria-hidden /></button>
                  </div>
                </div>
              )))}
            </div>
          );
        })}

        {view === "kelas" && data.classes.map((cl) => {
          const rows = data.asg.flatMap((a) => a.classes.filter((c) => c.class_id === cl.id).map((c) => ({ a, c })));
          if (!rows.length) return null;
          const tot = classTotal.get(cl.id) ?? 0;
          return (
            <div key={cl.id} className="grp">
              <div className="grp-h2"><b>Kelas {cl.name}</b><span className={`sub num ${data.cap && tot > data.cap ? "er" : ""}`}>{tot}{data.cap ? ` / ${data.cap}` : ""} JP</span></div>
              {rows.map(({ a, c }) => (
                <div key={c.id} className="br">
                  <div><b>{nm(data.subjects, a.subject_id)}</b><div className="sub">{nm(data.teachers, a.teacher_id)}</div></div>
                  <span className="num">{c.jp} JP</span>
                  <div className="acts">
                    <button type="button" className="btn t ib" aria-label={`Ubah beban ${nm(data.subjects, a.subject_id)} kelas ${cl.name}`} onClick={() => setEdit(a)}><Pencil size={16} aria-hidden /></button>
                    <button type="button" className="btn t ib dng" aria-label={`Hapus ${nm(data.subjects, a.subject_id)} dari kelas ${cl.name}`} onClick={() => removeRow(a, c.id)}><Trash2 size={16} aria-hidden /></button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        <div className="ct"><span>{data.cap ? `Kapasitas per kelas: ${data.cap} JP per minggu (dari Struktur Waktu)` : "Kapasitas belum dapat dihitung: Struktur Waktu belum diatur."}</span><span>Tahun ajaran {k.yearName}</span></div>
      </section>

      {edit && <BebanForm data={data} asg={edit === "new" ? null : edit} classTotal={classTotal} yearId={k.yearId} onClose={() => setEdit(null)} onDone={async () => { setEdit(null); await reload(); toast("Beban disimpan"); }} />}
      <Toaster />
    </>
  );
}

function BebanForm({ data, asg, classTotal, yearId, onClose, onDone }: { data: BebanData; asg: Asg | null; classTotal: Map<string, number>; yearId: string; onClose: () => void; onDone: () => Promise<void> }) {
  const [teacher, setTeacher] = useState(asg?.teacher_id ?? "");
  const [subject, setSubject] = useState(asg?.subject_id ?? "");
  const [jp, setJp] = useState<Record<string, string>>(() => Object.fromEntries((asg?.classes ?? []).map((c) => [c.class_id, String(c.jp)])));
  const [errs, setErrs] = useState<{ teacher?: string; subject?: string; classes?: string }>({});
  const [top, setTop] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Beban guru+mapel yang sudah ada digabung, bukan diduplikasi.
  const existing = asg ?? data.asg.find((a) => a.teacher_id === teacher && a.subject_id === subject) ?? null;
  const own = (cid: string) => existing?.classes.find((c) => c.class_id === cid)?.jp ?? 0;

  function diag(cid: string) {
    const n = Number(jp[cid]);
    const out: { kind: "er" | "wn"; text: string }[] = [];
    const base = (classTotal.get(cid) ?? 0) - own(cid);
    const after = base + (Number.isFinite(n) ? n : 0);
    if (data.cap && after > data.cap) out.push({ kind: "er", text: `Melebihi kapasitas: ${after} dari ${data.cap} JP.` });
    const other = data.asg.find((a) => a.id !== existing?.id && a.subject_id === subject && a.classes.some((c) => c.class_id === cid));
    if (subject && other) out.push({ kind: "wn", text: `Mapel ini di kelas tersebut sudah diampu ${nm(data.teachers, other.teacher_id)}.` });
    return { after, out };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: typeof errs = {};
    if (!teacher) er.teacher = "Guru wajib dipilih.";
    if (!subject) er.subject = "Mapel wajib dipilih.";
    const chosen = Object.keys(jp);
    if (!chosen.length) er.classes = "Pilih minimal satu kelas.";
    for (const cid of chosen) {
      const n = Number(jp[cid]);
      if (!Number.isInteger(n) || n < 1) er.classes = "JP setiap kelas harus bilangan bulat lebih dari 0.";
      else if (diag(cid).out.some((d) => d.kind === "er")) er.classes = "Ada kelas yang melebihi kapasitas JP.";
    }
    setErrs(er);
    if (Object.keys(er).length) return;

    const sb = getSupabase();
    if (!sb) return;
    setBusy(true); setTop(null);
    // Hanya mode Ubah yang boleh melepas kelas; mode Tambah menggabung tanpa menghapus.
    const removed = asg ? asg.classes.filter((c) => !chosen.includes(c.class_id)) : [];
    for (const r of removed) {
      const u = await sb.from("schedule_entries").select("*", { count: "exact", head: true }).eq("teaching_assignment_id", existing!.id).eq("class_id", r.class_id);
      if ((u.count ?? 0) > 0) { setTop(`Kelas ${nm(data.classes, r.class_id)} tidak dapat dilepas: dipakai pada ${u.count} jam di jadwal.`); setBusy(false); return; }
    }
    let id = existing?.id;
    if (!id) {
      const ins = await sb.from("teaching_assignments").insert({ academic_year_id: yearId, teacher_id: teacher, subject_id: subject }).select("id").single();
      if (ins.error) { setTop(ins.error.message); setBusy(false); return; }
      id = ins.data.id;
    }
    const up = await sb.from("teaching_assignment_classes").upsert(chosen.map((cid) => ({ teaching_assignment_id: id, class_id: cid, jp_per_week: Number(jp[cid]) })), { onConflict: "teaching_assignment_id,class_id" });
    if (up.error) { setTop(up.error.message); setBusy(false); return; }
    if (removed.length) {
      const del = await sb.from("teaching_assignment_classes").delete().eq("teaching_assignment_id", id).in("class_id", removed.map((r) => r.class_id));
      if (del.error) { setTop(del.error.message); setBusy(false); return; }
    }
    await onDone();
  }

  return (
    <Dialog title={asg ? "Ubah Beban Mengajar" : "Tambah Beban Mengajar"} onClose={onClose} wide>
      <form onSubmit={submit} noValidate>
        <label className="fl"><span>Guru *</span>
          <select id="b-teacher" value={teacher} disabled={Boolean(asg)} aria-invalid={Boolean(errs.teacher)} onChange={(e) => setTeacher(e.target.value)}>
            <option value="">Pilih guru</option>{data.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {errs.teacher && <div role="alert" className="em"><AlertCircle size={16} aria-hidden />{errs.teacher}</div>}
        </label>
        <label className="fl"><span>Mapel *</span>
          <select id="b-subject" value={subject} disabled={Boolean(asg)} aria-invalid={Boolean(errs.subject)} onChange={(e) => setSubject(e.target.value)}>
            <option value="">Pilih mapel</option>{data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {errs.subject && <div role="alert" className="em"><AlertCircle size={16} aria-hidden />{errs.subject}</div>}
        </label>
        {!asg && existing && <div className="imp" style={{ marginBottom: 12 }}>Guru dan mapel ini sudah punya beban. Perubahan akan digabung ke beban yang ada.</div>}

        <div className="sub" style={{ fontWeight: 500, marginBottom: 6 }}>Kelas dan JP per minggu *</div>
        <div role="group" aria-label="Kelas" style={{ maxHeight: "36vh", overflow: "auto" }}>
          {data.classes.map((c) => {
            const on = c.id in jp;
            const d = on ? diag(c.id) : null;
            return (
              <div key={c.id} className="cl">
                <input type="checkbox" id={`b-c-${c.id}`} checked={on} aria-label={`Kelas ${c.name}`} onChange={(e) => setJp((p) => { const n = { ...p }; if (e.target.checked) n[c.id] = n[c.id] ?? "2"; else delete n[c.id]; return n; })} />
                <label htmlFor={`b-c-${c.id}`}>{c.name}{c.grade ? <span className="sub"> · {c.grade}</span> : null}</label>
                <input type="number" min={1} inputMode="numeric" disabled={!on} aria-label={`JP kelas ${c.name}`} value={on ? jp[c.id] : ""} onChange={(e) => setJp((p) => ({ ...p, [c.id]: e.target.value }))} />
                {d && (
                  <div className="cap">
                    <span className="sub num">Total kelas {d.after}{data.cap ? ` / ${data.cap}` : ""} JP</span>
                    {d.out.map((x) => <div key={x.text} className={`dgn ${x.kind}`}><AlertTriangle size={16} aria-hidden /><span>{x.text}</span></div>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!data.cap && <p className="sub" style={{ marginTop: 8 }}>Kapasitas belum dapat diperiksa: Struktur Waktu belum diatur.</p>}
        {errs.classes && <div role="alert" className="em"><AlertCircle size={16} aria-hidden />{errs.classes}</div>}
        {top && <div role="alert" className="em" style={{ marginTop: 8 }}><AlertCircle size={16} aria-hidden />{top}</div>}
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 20 }}>
          <button type="button" className="btn t" onClick={onClose}>Batal</button>
          <button type="submit" className="btn f" disabled={busy}><Save size={18} aria-hidden />{busy ? "Menyimpan…" : "Simpan Perubahan"}</button>
        </div>
      </form>
    </Dialog>
  );
}
