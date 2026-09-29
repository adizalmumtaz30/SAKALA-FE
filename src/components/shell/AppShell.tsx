"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Moon, Sun, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { NAV } from "./nav";

const EVENT = "sakala-prefs";
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function notify() { window.dispatchEvent(new Event(EVENT)); }
function getTheme(): "dark" | "light" {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}
function getCollapsed(): boolean {
  try { return localStorage.getItem("sakala-sidebar") === "1"; } catch { return false; }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = useSyncExternalStore(subscribe, getTheme, () => "dark" as const);
  const collapsed = useSyncExternalStore(subscribe, getCollapsed, () => false);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("sakala-theme", next); } catch {}
    notify();
  }
  function toggleSidebar() {
    try { localStorage.setItem("sakala-sidebar", collapsed ? "0" : "1"); } catch {}
    notify();
  }

  return (
    <div className="flex min-h-screen">
      <aside
        aria-label="Navigasi utama"
        className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface md:flex"
        style={{ width: collapsed ? 72 : 248, transition: "width var(--motion-normal) var(--ease-out)" }}
      >
        <div className="flex h-16 items-center gap-3 px-4">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-brand text-sm font-semibold text-on-brand">S</span>
          {!collapsed && <span className="text-lg font-semibold tracking-tight">SAKALA</span>}
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="flex flex-col gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    title={collapsed ? label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-[0.9375rem] transition-colors ${active ? "bg-brand-tint text-fg" : "text-muted hover:bg-subtle hover:text-fg"}`}
                  >
                    <Icon size={20} strokeWidth={1.75} aria-hidden className={active ? "text-brand" : ""} />
                    {!collapsed && <span className="truncate">{label}</span>}
                    {collapsed && <span className="sr-only">{label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-line p-3">
          <button
            onClick={toggleSidebar}
            aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            className="flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 text-muted hover:bg-subtle hover:text-fg"
          >
            {collapsed ? <PanelLeftOpen size={20} strokeWidth={1.75} /> : <PanelLeftClose size={20} strokeWidth={1.75} />}
            {!collapsed && <span className="text-[0.9375rem]">Ciutkan</span>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-line bg-background/90 px-4 backdrop-blur-sm md:px-6">
          <span className="text-lg font-semibold tracking-tight md:hidden">SAKALA</span>
          <button
            type="button"
            className="ml-auto flex min-h-11 w-full max-w-md items-center gap-2 rounded-[var(--radius-sm)] border border-line-strong bg-surface px-3 text-[0.9375rem] text-muted md:ml-0"
            aria-label="Cari halaman atau aksi (segera hadir)"
            disabled
          >
            <Search size={18} strokeWidth={1.75} aria-hidden />
            <span className="truncate">Cari halaman atau aksi</span>
          </button>
          <span className="hidden whitespace-nowrap rounded-full border border-line-strong px-3 py-1 text-[0.8125rem] text-muted lg:inline">Tahun ajaran belum dipilih</span>
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Ganti ke tema terang" : "Ganti ke tema gelap"}
            className="ml-auto grid size-11 place-items-center rounded-[var(--radius-sm)] border border-line-strong bg-surface text-fg hover:bg-subtle md:ml-0"
          >
            {theme === "dark" ? <Sun size={20} strokeWidth={1.75} /> : <Moon size={20} strokeWidth={1.75} />}
          </button>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8">{children}</main>

        <nav aria-label="Navigasi utama (ponsel)" className="fixed inset-x-0 bottom-0 z-10 flex overflow-x-auto border-t border-line bg-surface md:hidden">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-14 min-w-[72px] flex-1 flex-col items-center justify-center gap-0.5 px-2 text-[0.6875rem] ${active ? "text-brand" : "text-muted"}`}>
                <Icon size={20} strokeWidth={1.75} aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
