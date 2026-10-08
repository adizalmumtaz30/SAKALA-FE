"use client";

import Link from "next/link";
import { Building2, CheckCircle2, AlertTriangle, ArrowUpRight, Users, BookOpen, GraduationCap, DoorOpen, CalendarDays, ChevronRight } from "lucide-react";
import { useBeranda } from "./useBeranda";
import { useConnection, connLabel } from "@/components/shell/useConnection";

function Empty({ icon: Icon, title, text, href, action }: { icon: typeof Users; title: string; text: string; href?: string; action?: string }) {
  return (
    <div className="emp">
      <Icon aria-hidden />
      <b>{title}</b>
      <p>{text}</p>
      {href && action && <Link href={href} className="btn t sm">{action}</Link>}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="bento" aria-busy="true" aria-label="Memuat">
      {[["c-id", 1], ["c-wk", 2], ["c-rd", 2], ["c-dt", 2], ["c-pc", 2]].map(([c, n]) => (
        <section key={String(c)} className={`card ${c}`}>{Array.from({ length: Number(n) + 1 }).map((_, i) => <div key={i} className="sk" style={{ width: i === 0 ? "55%" : "100%" }} />)}</section>
      ))}
    </div>
  );
}

const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function Beranda() {
  const d = useBeranda();
  const conn = useConnection();
  if (d.loading) return <Skeleton />;
  if (d.error) {
    return (
      <section className="card">
        <Empty icon={AlertTriangle} title="Data tidak dapat dibaca" text="Koneksi ke database gagal. Periksa status koneksi di bar atas, lalu muat ulang." />
      </section>
    );
  }

  const c = d.counts;
  const pre: [string, boolean, string][] = [
    ["Guru", c.teachers > 0, "/guru"],
    ["Mapel", c.subjects > 0, "/mapel"],
    ["Kelas", c.classes > 0, "/kelas"],
    ["Beban Mengajar", c.assignments > 0, "/beban-mengajar"],
    ["Jam ke-", false, "/setting-jadwal"], // tabel Struktur Waktu belum ada: belum dapat terpenuhi
  ];
  const ok = pre.filter((p) => p[1]).length;
  const missing = pre.filter((p) => !p[1]).map((p) => p[0]);
  const core: [string, typeof Users, number, string][] = [
    ["Guru", Users, c.teachers, "/guru"], ["Mapel", BookOpen, c.subjects, "/mapel"],
    ["Kelas", GraduationCap, c.classes, "/kelas"], ["Ruang", DoorOpen, c.rooms, "/ruang"],
  ];
  const checks: { t: string; s: string; a: string; h: string }[] = [];
  if (!pre[4][1]) checks.push({ t: "Jam ke- belum diatur", s: "Struktur Waktu wajib ada sebelum jadwal dibuat.", a: "Atur Struktur Waktu", h: "/setting-jadwal" });
  if (c.teachers === 0) checks.push({ t: "Belum ada data guru", s: "Tambahkan guru atau impor dari berkas.", a: "Buka Guru", h: "/guru" });
  if (c.assignments === 0) checks.push({ t: "Belum ada beban mengajar", s: "Isi Guru + Mapel + Kelas + Target JP.", a: "Buka Beban Mengajar", h: "/beban-mengajar" });

  const now = new Date();
  const dow = (now.getDay() + 6) % 7;
  const mon = new Date(now); mon.setDate(now.getDate() - dow + (now.getDay() === 0 ? 7 : 0));
  const label = mon.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const empty = c.teachers + c.subjects + c.classes + c.rooms === 0;
  const tone = conn.db === "ok" ? "ok" : conn.db === "wait" ? "wait" : "down";

  return (
    <div className="bento">
      <section className="card c-id" style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <span style={{ width: 48, height: 48, borderRadius: "50%", background: "color-mix(in srgb, var(--ac) 16%, transparent)", color: "var(--ac)", display: "grid", placeItems: "center" }}><Building2 size={24} aria-hidden /></span>
          <div>
            <b style={{ font: "600 17px/22px var(--font-sans)" }}>{d.school ?? "Sekolah belum diatur"}</b>
            <div className="sub">{d.school ? "Dari database" : "Atur nama sekolah di Profil"}</div>
            <span className="live" data-s={tone}><i />{connLabel(conn)}</span>
          </div>
        </div>
        <Link href="/laporan/magis" className="btn f" style={{ height: 56, borderRadius: 24, padding: "0 24px", flex: "1 1 260px", justifyContent: "space-between" }}>
          <span style={{ textAlign: "left" }}>Buka MAGIS<small style={{ display: "block", font: "400 13px/18px var(--font-sans)", opacity: 0.85 }}>Madrasah Digital Supervision</small></span>
          <ArrowUpRight size={28} aria-hidden />
        </Link>
      </section>

      <section className="card c-wk">
        <h2 className="h2">{label}</h2>
        <div className="days">
          {DAYS.map((n, i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); return <div key={n} className={`dy ${x.toDateString() === now.toDateString() ? "td" : ""}`}>{n}<b>{x.getDate()}</b></div>; })}
        </div>
        <Empty icon={CalendarDays} title="Belum ada kejadian" text="Penerapan jadwal dan perubahan massal akan muncul di sini." />
      </section>

      <section className="card c-rd">
        <h2 style={{ font: "700 28px/34px var(--font-sans)", letterSpacing: "-0.018em", marginBottom: 4 }}>Kesiapan</h2>
        <div className="sub">{ok} dari 5 prasyarat terpenuhi</div>
        <div className="pqs">
          {pre.map(([n, good, h]) => (
            <Link key={n} href={h} className={`pq ${good ? "ok" : "no"}`}>{good ? <CheckCircle2 aria-hidden /> : <AlertTriangle aria-hidden />}{n}</Link>
          ))}
        </div>
        <div className="sub"><b style={{ color: "var(--t1)" }}>Belum siap.</b> Prasyarat hard belum lengkap: {missing.join(", ")}.</div>
      </section>

      <section className="card c-dt">
        <h2 className="h2">Data Inti</h2>
        {empty ? (
          <Empty icon={Users} title="Belum ada data inti" text="Mulai dengan Guru, lalu Mapel dan Kelas." href="/guru" action="Buka Guru" />
        ) : (
          core.map(([n, Icon, v, h]) => (
            <Link key={n} href={h} className="mr" style={{ color: "inherit", textDecoration: "none" }}>
              <span style={{ color: "var(--t2)" }}><Icon size={22} aria-hidden /></span><b>{n}</b><span className="num">{v}</span>
            </Link>
          ))
        )}
      </section>

      <div className="c-mid">
        <section className="card c-sk">
          <h2 className="h2">Skor Kesiapan</h2>
          <div className="big">{ok}<span style={{ fontSize: 24, color: "var(--t2)", fontWeight: 500 }}>/5</span></div>
          <div style={{ display: "flex", gap: 8, margin: "10px 0 6px" }} aria-hidden>
            {pre.map(([n, g]) => <i key={n} style={{ width: 14, height: 14, borderRadius: "50%", border: "1px solid var(--hl)", background: g ? "var(--ac)" : "var(--s2)" }} />)}
          </div>
          <div className="sub">prasyarat terpenuhi</div>
        </section>
        <section className="card c-pj">
          <h2 className="h2">Cakupan JP</h2>
          <Empty icon={CalendarDays} title="Belum ada jadwal" text="Cakupan muncul setelah jadwal dibuat." />
        </section>
      </div>

      <section className="card c-pc">
        <h2 className="h2">Perlu Dicek</h2>
        {checks.length === 0 ? (
          <Empty icon={CheckCircle2} title="Tidak ada yang perlu dicek" text="Semua prasyarat terpantau terpenuhi." />
        ) : (
          checks.slice(0, 3).map((x) => (
            <div key={x.t} className="dg">
              <span className="chip wn" style={{ padding: "0 6px" }}><AlertTriangle aria-hidden /></span>
              <div><b>{x.t}</b><span className="sub">{x.s}</span><br /><Link href={x.h} className="lk">{x.a}<ChevronRight size={16} aria-hidden /></Link></div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
