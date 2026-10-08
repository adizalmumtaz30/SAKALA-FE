"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Search } from "lucide-react";
import { NAV_GROUPS, NAV_BOTTOM, type NavItem } from "@/components/shell/nav";

const GROUPS: { title: string; items: NavItem[] }[] = [
  { title: "Ringkasan", items: NAV_GROUPS[0].items },
  { title: "Data", items: NAV_GROUPS[1].items },
  { title: "Operasi", items: NAV_GROUPS[2].items },
  { title: "Lainnya", items: NAV_BOTTOM },
];

export function DaftarMenu() {
  const q = (useSearchParams().get("q") ?? "").trim().toLowerCase();
  const shown = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(q)) })).filter((g) => g.items.length);
  if (!shown.length) {
    return <div className="emp"><Search aria-hidden /><b>Menu tidak ditemukan</b><p>Coba kata kunci lain.</p></div>;
  }
  return (
    <>
      {shown.map((g) => (
        <section key={g.title} aria-label={g.title}>
          <div className="grp-h">{g.title}</div>
          <div className="mnc">
            {g.items.map((i) => {
              const Icon = i.icon;
              return (
                <Link key={i.href} href={i.children?.[0]?.href ?? i.href} className="mn">
                  <div className="ti2"><Icon size={24} aria-hidden /><ArrowUpRight size={18} aria-hidden style={{ color: "var(--t3)" }} /></div>
                  <div><b>{i.label}</b></div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
