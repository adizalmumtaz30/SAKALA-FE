"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Moon, Sun, Search, User, LogOut, ChevronDown, Home, CalendarDays, UserCheck, Users, LayoutGrid } from "lucide-react";
import { NAV_GROUPS, NAV_BOTTOM, ALL_ITEMS, isActive, titleFor, type NavItem } from "./nav";
import { useConnection, connLabel } from "./useConnection";

const EVENT = "sakala-prefs";
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
}
const notify = () => window.dispatchEvent(new Event(EVENT));
const read = (k: string, d = "") => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} notify(); };
const getTheme = (): "dark" | "light" => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
const initials = (n: string) => n.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "OP";

function Logo() {
  return (
    <svg viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 5 8 14h24z" /><path d="M20 12 6 24h28z" /><path d="M20 21 4 34h32z" />
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const conn = useConnection();
  const theme = useSyncExternalStore(subscribe, getTheme, () => "dark" as const);
  const expanded = useSyncExternalStore(subscribe, () => read("sakala-sidebar") === "ex", () => false);
  const name = useSyncExternalStore(subscribe, () => read("sakala-name", "Operator"), () => "Operator");

  const navRef = useRef<HTMLElement>(null);
  const dotRef = useRef<HTMLElement>(null);
  const [fly, setFly] = useState<{ item: NavItem; top: number; left: number } | null>(null);
  const [tip, setTip] = useState<{ label: string; top: number; left: number } | null>(null);
  const [profOpen, setProfOpen] = useState(false);
  const [sheet, setSheet] = useState<"Data" | "Lainnya" | null>(null);

  useEffect(() => {
    document.documentElement.style.setProperty("--rw", expanded ? "232px" : "72px");
  }, [expanded]);

  const placeDot = useCallback(() => {
    const nav = navRef.current, dot = dotRef.current;
    if (!nav || !dot) return;
    const el = nav.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el) { dot.style.opacity = "0"; return; }
    dot.style.opacity = "1";
    dot.style.transform = `translateY(${el.offsetTop + (el.offsetHeight - 52) / 2}px)`;
  }, []);
  useLayoutEffect(() => { placeDot(); }, [pathname, expanded, placeDot]);
  useEffect(() => {
    const t = setTimeout(placeDot, 400);
    window.addEventListener("resize", placeDot);
    return () => { clearTimeout(t); window.removeEventListener("resize", placeDot); };
  }, [pathname, expanded, placeDot]);

  useEffect(() => {
    function key(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toUpperCase();
      if (e.key === "[" && !/INPUT|SELECT|TEXTAREA/.test(tag)) write("sakala-sidebar", expanded ? "" : "ex");
      if (e.key === "Escape") { setFly(null); setProfOpen(false); setSheet(null); }
    }
    function away(e: MouseEvent) { if ((e.target as HTMLElement | null)?.closest?.("[data-keep]")) return; setFly(null); setProfOpen(false); }
    window.addEventListener("keydown", key);
    document.addEventListener("click", away);
    return () => { window.removeEventListener("keydown", key); document.removeEventListener("click", away); };
  }, [expanded]);

  function toggleTheme(next: "dark" | "light") {
    document.documentElement.dataset.theme = next;
    write("sakala-theme", next);
  }

  function showTip(e: React.PointerEvent | React.FocusEvent, label: string) {
    if (expanded) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTip({ label, left: r.right + 12, top: r.top + r.height / 2 - 16 });
  }

  function railItem(item: NavItem) {
    const Icon = item.icon;
    const active = isActive(item, pathname);
    const common = {
      className: "nb",
      "aria-current": active ? ("page" as const) : undefined,
      "aria-label": item.label,
      onPointerEnter: (e: React.PointerEvent) => showTip(e, item.label),
      onPointerLeave: () => setTip(null),
      onFocus: (e: React.FocusEvent) => showTip(e, item.label),
      onBlur: () => setTip(null),
    };
    const inner = (<><Icon size={24} strokeWidth={1.75} aria-hidden /><span>{item.label}</span></>);
    if (item.children) {
      return (
        <button
          key={item.href} type="button" {...common}
          aria-haspopup="menu" data-keep aria-expanded={fly?.item.href === item.href}
          onClick={(e) => {
            e.stopPropagation();
            const r = e.currentTarget.getBoundingClientRect();
            setProfOpen(false);
            setFly((f) => (f?.item.href === item.href ? null : { item, left: r.right + 12, top: Math.min(r.top, window.innerHeight - item.children!.length * 48 - 24) }));
          }}
        >{inner}</button>
      );
    }
    return <Link key={item.href} href={item.href} {...common}>{inner}</Link>;
  }

  const sheetItems = sheet === "Data"
    ? ALL_ITEMS.filter((i) => ["/guru", "/mapel", "/kelas", "/ruang", "/beban-mengajar", "/import"].includes(i.href))
    : ALL_ITEMS.filter((i) => ["/menu", "/setting-jadwal", "/laporan/rekap-jtm", "/riwayat", "/referensi", "/settings"].includes(i.href) || i.href === "/laporan");

  const title = titleFor(pathname);
  const status = conn.db === "ok" ? "ok" : conn.db === "wait" ? "wait" : "down";

  return (
    <>
      <aside id="rail" aria-label="Navigasi utama" className={`rail ${expanded ? "ex" : ""}`}>
        <div className="rlogo"><Logo /><b>SAKALA</b></div>
        <div className="ctx" title="Ganti Tahun Ajaran">{expanded ? "Tahun ajaran belum dipilih" : "–/– · –"}</div>
        <nav ref={navRef} className="pill glass nav">
          <i ref={dotRef} className="dot" aria-hidden />
          {NAV_GROUPS.map((g, gi) => (
            <div key={g.id} style={{ display: "contents" }}>
              {gi > 0 && <i className="sep" aria-hidden />}
              {g.items.map(railItem)}
            </div>
          ))}
        </nav>
        <div className="pill glass bot">{NAV_BOTTOM.map(railItem)}</div>
      </aside>

      {tip && !fly && <div className="tip glass" role="tooltip" style={{ left: tip.left, top: tip.top, opacity: 1 }}>{tip.label}</div>}
      {fly && (
        <div className="fly glass" data-keep role="menu" style={{ left: fly.left, top: fly.top }} onClick={(e) => e.stopPropagation()}>
          {fly.item.children!.map((c) => (
            <Link key={c.href} href={c.href} role="menuitem" className="menu-i" onClick={() => setFly(null)}>{c.label}</Link>
          ))}
        </div>
      )}

      <div className="shmain">
        <header className="top glass">
          <div className="bc">{title === "Beranda" ? <b>Beranda</b> : <>Beranda › <b>{title}</b></>}</div>
          <form
            className="srch" role="search"
            onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get("q"); router.push(`/menu${q ? `?q=${encodeURIComponent(String(q))}` : ""}`); }}
          >
            <Search size={18} aria-hidden />
            <input name="q" placeholder="Cari modul, guru, mapel, kelas" aria-label="Pencarian" />
          </form>
          <div className="tg" role="group" aria-label="Tema">
            <button type="button" aria-label="Gelap" aria-pressed={theme === "dark"} onClick={() => toggleTheme("dark")}><Moon size={18} /></button>
            <button type="button" aria-label="Terang" aria-pressed={theme === "light"} onClick={() => toggleTheme("light")}><Sun size={18} /></button>
          </div>
          <div className="st" data-s={status} role="status"><i /><span>{connLabel(conn)}</span></div>
          <div className="prof">
            <button type="button" className="pb" data-keep aria-haspopup="menu" aria-expanded={profOpen} onClick={(e) => { e.stopPropagation(); setFly(null); setProfOpen((o) => !o); }}>
              <span className="av">{initials(name)}</span><span>{name}</span><ChevronDown size={16} aria-hidden />
            </button>
            {profOpen && (
              <div className="pop glass" data-keep role="menu" onClick={(e) => e.stopPropagation()}>
                <Link href="/profil" role="menuitem" className="menu-i" onClick={() => setProfOpen(false)}><User size={18} />Profil Saya</Link>
                <button type="button" role="menuitem" className="menu-i" onClick={() => setProfOpen(false)}><LogOut size={18} />Keluar</button>
              </div>
            )}
          </div>
        </header>
        <main id="konten">{children}</main>
      </div>

      <nav className="tab glass" aria-label="Navigasi utama (ponsel)">
        <Link href="/" aria-current={pathname === "/" ? "page" : undefined}><Home size={22} />Beranda</Link>
        <Link href="/jadwal" aria-current={pathname.startsWith("/jadwal") ? "page" : undefined}><CalendarDays size={22} />Jadwal</Link>
        <button type="button" onClick={(e) => { e.stopPropagation(); setSheet("Data"); }}><Users size={22} />Data</button>
        <Link href="/absensi" aria-current={pathname.startsWith("/absensi") ? "page" : undefined}><UserCheck size={22} />Absensi</Link>
        <button type="button" onClick={(e) => { e.stopPropagation(); setSheet("Lainnya"); }}><LayoutGrid size={22} />Lainnya</button>
      </nav>

      {sheet && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgb(0 0 0 / .45)", display: "flex", alignItems: "flex-end" }} onClick={() => setSheet(null)}>
          <div className="glass" role="dialog" aria-modal="true" aria-label={sheet} onClick={(e) => e.stopPropagation()} style={{ width: "100%", borderRadius: "24px 24px 0 0", padding: "8px 20px 28px", maxHeight: "88vh", overflow: "auto" }}>
            <div style={{ width: 36, height: 5, borderRadius: 99, background: "var(--t3)", opacity: 0.6, margin: "4px auto 16px" }} />
            <h2 className="h2">{sheet}</h2>
            <div style={{ display: "grid", gap: 6 }}>
              {sheetItems.map((i) => {
                const Icon = i.icon;
                return <Link key={i.href} href={i.href} className="menu-i" onClick={() => setSheet(null)}><Icon size={20} />{i.label}</Link>;
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
