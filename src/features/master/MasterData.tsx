"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Plus, Pencil, Trash2, Search, ArrowUpDown, AlertCircle, Save, Inbox } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/Dialog";
import { Dropdown } from "@/components/ui/Dropdown";
import { toast, Toaster } from "@/components/ui/toast";
import { useKonteks } from "@/features/konteks/useKonteks";
import { KonteksForm } from "@/features/konteks/KonteksForm";
import { CONFIGS, type Kind } from "./configs";

export type Row = Record<string, unknown> & { id: string };
export type Field = { key: string; label: string; type?: "text" | "number" | "email" | "bool"; required?: boolean; max?: number; placeholder?: string };
export type Col = { key: string; label: string; sortable?: boolean; mono?: boolean; render?: (r: Row) => ReactNode };
export type Config = {
  title: string; noun: string; table: string; scope: "school" | "year";
  cols: Col[]; fields: Field[]; searchKeys: string[]; orderBy: string;
  filter?: { label: string; all: string; value: (r: Row) => string };
  strip?: (r: Row) => string | undefined;
  usage?: { table: string; column: string; text: (n: number) => string };
  derive?: (vals: Record<string, unknown>, rows: Row[]) => Record<string, unknown>;
  lead: string;
};

const str = (v: unknown) => (v == null ? "" : String(v));
const friendly = (e: { code?: string; message: string }) => (e.code === "23505" ? "Data dengan nama atau kode yang sama sudah ada." : e.code === "23503" ? "Data ini masih dipakai oleh data lain." : e.message);

export function MasterData({ kind }: { kind: Kind }) {
  const cfg: Config = CONFIGS[kind];
  const k = useKonteks();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [fi, setFi] = useState(0);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: cfg.orderBy, dir: 1 });
  const [edit, setEdit] = useState<Row | "new" | null>(null);
  const [del, setDel] = useState<{ row: Row; used: number } | null>(null);

  const scopeCol = cfg.scope === "school" ? "school_id" : "academic_year_id";
  const scopeId = cfg.scope === "school" ? k.schoolId : k.yearId;

  const load = useCallback(async (id: string) => {
    const sb = getSupabase();
    if (!sb) return { rows: null, err: "Konfigurasi Supabase tidak ditemukan." };
    const r = await sb.from(cfg.table).select("*").eq(scopeCol, id).order(cfg.orderBy, { ascending: true });
    return r.error ? { rows: null, err: r.error.message } : { rows: r.data as Row[], err: null };
  }, [cfg.table, cfg.orderBy, scopeCol]);

  useEffect(() => {
    if (!scopeId) return;
    let alive = true;
    load(scopeId).then((r) => { if (alive) { setRows(r.rows); setErr(r.err); } });
    return () => { alive = false; };
  }, [scopeId, load]);

  async function reload() { if (scopeId) { const r = await load(scopeId); setRows(r.rows); setErr(r.err); } }

  const filters = useMemo(() => {
    if (!cfg.filter || !rows) return [] as string[];
    return [cfg.filter.all, ...Array.from(new Set(rows.map(cfg.filter.value).filter(Boolean))).sort((a, b) => a.localeCompare(b, "id", { numeric: true }))];
  }, [rows, cfg.filter]);

  const shown = useMemo(() => {
    if (!rows) return [];
    const s = q.trim().toLowerCase();
    const f = fi > 0 && cfg.filter ? filters[fi] : null;
    const out = rows.filter((r) => (!f || cfg.filter!.value(r) === f) && (!s || cfg.searchKeys.some((key) => str(r[key]).toLowerCase().includes(s))));
    out.sort((a, b) => {
      const x = a[sort.key], y = b[sort.key];
      const c = typeof x === "number" && typeof y === "number" ? x - y : str(x).localeCompare(str(y), "id", { numeric: true });
      return c * sort.dir;
    });
    return out;
  }, [rows, q, fi, filters, sort, cfg]);

  async function save(vals: Record<string, unknown>, id?: string) {
    const sb = getSupabase();
    if (!sb || !k.schoolId) return "Konteks sekolah belum siap.";
    if (id) {
      const r = await sb.from(cfg.table).update(vals).eq("id", id);
      if (r.error) return friendly(r.error);
    } else {
      const base: Record<string, unknown> = cfg.scope === "school" ? { school_id: k.schoolId } : { school_id: k.schoolId, academic_year_id: k.yearId };
      const extra = cfg.derive ? cfg.derive(vals, rows ?? []) : {};
      const r = await sb.from(cfg.table).insert({ ...base, ...vals, ...extra });
      if (r.error) return friendly(r.error);
    }
    await reload();
    toast(id ? `${cfg.noun} diperbarui` : `${cfg.noun} ditambahkan`);
    return null;
  }

  async function askDelete(row: Row) {
    let used = 0;
    const sb = getSupabase();
    if (cfg.usage && sb) {
      const r = await sb.from(cfg.usage.table).select("*", { count: "exact", head: true }).eq(cfg.usage.column, row.id);
      used = r.count ?? 0;
    }
    setDel({ row, used });
  }

  async function doDelete(row: Row) {
    const sb = getSupabase();
    if (!sb) return;
    const r = await sb.from(cfg.table).delete().eq("id", row.id);
    setDel(null);
    if (r.error) { toast(`Gagal menghapus: ${friendly(r.error)}`); return; }
    await reload();
    toast(`${cfg.noun} dihapus`, async () => {
      const back = await sb.from(cfg.table).insert(row);
      if (back.error) toast(`Gagal mengurungkan: ${back.error.message}`); else { await reload(); toast(`${cfg.noun} dikembalikan`); }
    });
  }

  if (k.loading) return <section className="card" aria-busy="true"><div className="sk" style={{ width: "40%" }} /><div className="sk" /><div className="sk" /></section>;
  if (k.error) return <section className="card"><div className="emp"><AlertCircle aria-hidden /><b>Data tidak dapat dibaca</b><p>{k.error}</p></div></section>;
  if (!k.schoolId || (cfg.scope === "year" && !k.yearId) || !k.yearId) return <KonteksForm konteks={k} />;

  const empty = rows !== null && rows.length === 0;
  const filtered = !empty && shown.length === 0;

  return (
    <>
    <section className="card" aria-live="polite">
      <div className="tb">
        <label className="srch" style={{ margin: 0, maxWidth: "none", flex: "1 1 200px" }}>
          <Search size={18} aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Cari ${cfg.noun.toLowerCase()}`} aria-label={`Cari ${cfg.noun.toLowerCase()}`} />
        </label>
        {cfg.filter && filters.length > 1 && <Dropdown items={filters} value={fi} onChange={setFi} label={cfg.filter.label} />}
        <button type="button" className="btn f" onClick={() => setEdit("new")}><Plus size={18} aria-hidden />Tambah {cfg.noun}</button>
      </div>

      {err && <div role="alert" className="er" style={{ margin: "8px 0" }}>{err}</div>}
      {rows === null && !err && <><div className="sk" /><div className="sk" /><div className="sk" /></>}

      {empty && (
        <div className="emp"><Inbox aria-hidden /><b>Belum ada {cfg.noun.toLowerCase()}</b><p>{cfg.lead}</p>
          <button type="button" className="btn t sm" onClick={() => setEdit("new")}><Plus size={16} aria-hidden />Tambah {cfg.noun}</button></div>
      )}
      {filtered && (
        <div className="emp"><Search aria-hidden /><b>{cfg.noun} tidak ditemukan</b><p>Tidak ada hasil untuk filter saat ini.</p>
          <button type="button" className="btn t sm" onClick={() => { setQ(""); setFi(0); }}>Hapus filter</button></div>
      )}

      {shown.length > 0 && (
        <>
          <div className="tw">
            <table style={{ minWidth: 560 }}>
              <thead>
                <tr>
                  {cfg.cols.map((c) => (
                    <th key={c.key} aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                      {c.sortable === false ? c.label : (
                        <button type="button" className="th-b" onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (s.dir === 1 ? -1 : 1) : 1 }))}>{c.label}<ArrowUpDown size={14} aria-hidden /></button>
                      )}
                    </th>
                  ))}
                  <th style={{ textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} style={{ ["--c" as string]: cfg.strip?.(r) ?? "transparent" }}>
                    {cfg.cols.map((c) => <td key={c.key} className={c.mono ? "num" : undefined}>{c.render ? c.render(r) : str(r[c.key]) || "—"}</td>)}
                    <td>
                      <div className="acts">
                        <button type="button" className="btn t ib" aria-label={`Ubah ${str(r.name)}`} onClick={() => setEdit(r)}><Pencil size={16} aria-hidden /></button>
                        <button type="button" className="btn t ib dng" aria-label={`Hapus ${str(r.name)}`} onClick={() => askDelete(r)}><Trash2 size={16} aria-hidden /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ct"><span>Menampilkan {shown.length} dari {rows?.length ?? 0} {cfg.noun.toLowerCase()}</span><span>Tahun ajaran {k.yearName}</span></div>
        </>
      )}

      {edit && <FormDialog cfg={cfg} row={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSave={async (v) => { const m = await save(v, edit === "new" ? undefined : edit.id); if (!m) setEdit(null); return m; }} />}
      {del && (
        <Dialog title={`Hapus ${str(del.row.name)}?`} onClose={() => setDel(null)}>
          {del.used > 0 ? (
            <>
              <div className="imp"><b>Tidak dapat dihapus.</b> {cfg.usage?.text(del.used)} Hapus pemakaiannya terlebih dahulu.</div>
              <div className="row" style={{ justifyContent: "flex-end", marginTop: 16 }}><button type="button" className="btn t" onClick={() => setDel(null)}>Mengerti</button></div>
            </>
          ) : (
            <>
              <p className="sub" style={{ margin: "8px 0 16px" }}>Data dihapus dari daftar. Anda dapat mengurungkannya segera setelahnya.</p>
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button type="button" className="btn t" onClick={() => setDel(null)}>Batal</button>
                <button type="button" className="btn dn" onClick={() => doDelete(del.row)}><Trash2 size={18} aria-hidden />Hapus</button>
              </div>
            </>
          )}
        </Dialog>
      )}
    </section>
    <Toaster />
    </>
  );
}

function FormDialog({ cfg, row, onClose, onSave }: { cfg: Config; row: Row | null; onClose: () => void; onSave: (v: Record<string, unknown>) => Promise<string | null> }) {
  const [v, setV] = useState<Record<string, string | boolean>>(() => Object.fromEntries(cfg.fields.map((f) => [f.key, f.type === "bool" ? (row ? Boolean(row[f.key]) : true) : str(row?.[f.key])])));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [top, setTop] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    const out: Record<string, unknown> = {};
    for (const f of cfg.fields) {
      const raw = v[f.key];
      if (f.type === "bool") { out[f.key] = Boolean(raw); continue; }
      const s = String(raw).trim();
      if (f.required && !s) { er[f.key] = `${f.label} wajib diisi.`; continue; }
      if (f.type === "email" && s && !/^\S+@\S+\.\S+$/.test(s)) { er[f.key] = "Format email tidak valid."; continue; }
      if (f.type === "number") {
        if (s === "") { out[f.key] = null; continue; }
        const n = Number(s);
        if (!Number.isFinite(n) || n < 1) { er[f.key] = `${f.label} harus angka lebih dari 0.`; continue; }
        out[f.key] = Math.floor(n); continue;
      }
      out[f.key] = s === "" ? null : s;
    }
    setErrs(er);
    if (Object.keys(er).length) { document.getElementById(`f-${Object.keys(er)[0]}`)?.focus(); return; }
    setBusy(true); setTop(null);
    const m = await onSave(out);
    if (m) setTop(m);
    setBusy(false);
  }

  return (
    <Dialog title={`${row ? "Ubah" : "Tambah"} ${cfg.noun}`} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {cfg.fields.map((f) => f.type === "bool" ? (
          <label key={f.key} className="rd" style={{ marginBottom: 14 }}>
            <input type="checkbox" checked={Boolean(v[f.key])} onChange={(e) => setV({ ...v, [f.key]: e.target.checked })} />{f.label}
          </label>
        ) : (
          <label key={f.key} className="fl">
            <span>{f.label}{f.required ? " *" : ""}</span>
            <input id={`f-${f.key}`} type={f.type === "number" ? "number" : f.type === "email" ? "email" : "text"} min={f.type === "number" ? 1 : undefined} maxLength={f.max ?? 120} placeholder={f.placeholder}
              value={String(v[f.key])} aria-invalid={Boolean(errs[f.key])} aria-describedby={errs[f.key] ? `e-${f.key}` : undefined}
              onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
            {errs[f.key] && <div id={`e-${f.key}`} role="alert" className="em"><AlertCircle size={16} aria-hidden />{errs[f.key]}</div>}
          </label>
        ))}
        {top && <div role="alert" className="em" style={{ marginBottom: 12 }}><AlertCircle size={16} aria-hidden />{top}</div>}
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 20 }}>
          <button type="button" className="btn t" onClick={onClose}>Batal</button>
          <button type="submit" className="btn f" disabled={busy}><Save size={18} aria-hidden />{busy ? "Menyimpan…" : "Simpan Perubahan"}</button>
        </div>
      </form>
    </Dialog>
  );
}
