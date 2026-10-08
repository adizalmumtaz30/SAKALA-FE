"use client";

import { useState, useSyncExternalStore } from "react";
import { Save, AlertCircle } from "lucide-react";

const EVENT = "sakala-prefs";
const subscribe = (cb: () => void) => { window.addEventListener(EVENT, cb); window.addEventListener("storage", cb); return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); }; };
const get = () => { try { return localStorage.getItem("sakala-name") ?? "Operator"; } catch { return "Operator"; } };

export function Profil() {
  const saved = useSyncExternalStore(subscribe, get, () => "Operator");
  const [draft, setDraft] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [done, setDone] = useState(false);
  const value = draft ?? saved;

  function save() {
    const v = value.trim();
    if (!v) { setErr(true); return; }
    try { localStorage.setItem("sakala-name", v); } catch {}
    window.dispatchEvent(new Event(EVENT));
    setDraft(null); setErr(false); setDone(true);
  }

  return (
    <section className="card">
      <div className="row" style={{ alignItems: "flex-end", gap: 12 }}>
        <label style={{ flex: 1, minWidth: 220 }}>
          <span className="sub" style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Ubah Nama</span>
          <input
            value={value} maxLength={40} aria-invalid={err} aria-describedby={err ? "nama-err" : undefined}
            onChange={(e) => { setDraft(e.target.value); setDone(false); setErr(false); }}
            style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 14, background: "var(--s2)", border: `1px solid ${err ? "var(--er)" : "var(--hl)"}` }}
          />
          {err && <div id="nama-err" role="alert" className="er" style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6, fontSize: 13 }}><AlertCircle size={16} />Nama wajib diisi.</div>}
        </label>
        <button type="button" className="btn f" onClick={save}><Save size={18} aria-hidden />Simpan Perubahan</button>
      </div>
      <p className="sub" role="status" style={{ marginTop: 12 }}>{done ? "Perubahan disimpan." : "Mode Pengembangan: jangan memasukkan data sekolah sungguhan."}</p>
    </section>
  );
}
