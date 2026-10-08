import {
  LayoutGrid, Home, Users, BookOpen, GraduationCap, DoorOpen, Scale, RefreshCw, Clock,
  CalendarDays, UserCheck, BarChart3, History, Library, SlidersHorizontal, ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";

export type NavChild = { href: string; label: string };
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  hint: string;
  children?: NavChild[];
};
export type NavGroup = { id: string; items: NavItem[] };

// Struktur menu §3.2 + §7B.2 (dokumen master).
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "ringkasan",
    items: [
      { href: "/menu", label: "Daftar Menu", icon: LayoutGrid, hint: "Semua modul dalam satu halaman" },
      { href: "/", label: "Beranda", icon: Home, hint: "Kesiapan jadwal dan hal yang perlu dicek" },
    ],
  },
  {
    id: "data",
    items: [
      { href: "/guru", label: "Guru", icon: Users, hint: "Data guru dan tenaga kependidikan" },
      { href: "/mapel", label: "Mapel", icon: BookOpen, hint: "Mata pelajaran dan target JP per tingkat" },
      { href: "/kelas", label: "Kelas", icon: GraduationCap, hint: "Kelas, rombel, dan wali kelas" },
      { href: "/ruang", label: "Ruang", icon: DoorOpen, hint: "Ruang dan kapasitas" },
      { href: "/beban-mengajar", label: "Beban Mengajar", icon: Scale, hint: "Guru, mapel, kelas, dan target JP per minggu" },
      { href: "/import", label: "Import/Sinkronisasi", icon: RefreshCw, hint: "Masukkan dan sinkronkan data" },
    ],
  },
  {
    id: "operasi",
    items: [
      { href: "/setting-jadwal", label: "Setting Jadwal", icon: Clock, hint: "Template jadwal dan Struktur Waktu (Jam ke-)" },
      {
        href: "/jadwal", label: "Jadwal", icon: CalendarDays, hint: "Schedule Canvas per kelas",
        children: [
          { href: "/jadwal", label: "Schedule Canvas" },
          { href: "/jadwal/per-guru", label: "Jadwal Per Guru" },
          { href: "/jadwal/per-kelas", label: "Jadwal Per Kelas" },
        ],
      },
      {
        href: "/absensi", label: "Absensi", icon: UserCheck, hint: "Presensi PTK",
        children: [
          { href: "/absensi", label: "Presensi PTK (Harian)" },
          { href: "/absensi/rekap", label: "Rekap Bulanan" },
        ],
      },
      {
        href: "/laporan", label: "Laporan", icon: BarChart3, hint: "Ringkasan, rekap JTM, dan analitik",
        children: [
          { href: "/laporan/rekap-jtm", label: "Rekap JTM" },
          { href: "/laporan/magis", label: "Analitik MAGIS" },
        ],
      },
      { href: "/riwayat", label: "Riwayat", icon: History, hint: "Versi jadwal dan perubahan" },
    ],
  },
];

export const NAV_BOTTOM: NavItem[] = [
  { href: "/referensi", label: "Referensi", icon: Library, hint: "Jenjang, status kehadiran, hari libur" },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal, hint: "Tampilan, transparansi, dan sidebar" },
  { href: "/tahun-ajaran", label: "Ganti Tahun Ajaran", icon: ArrowLeftRight, hint: "Konteks tahun ajaran dan semester" },
];

export const ALL_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((g) => g.items), ...NAV_BOTTOM];

export function isActive(item: NavItem, pathname: string) {
  if (item.href === "/") return pathname === "/";
  if (item.children) return item.children.some((c) => pathname === c.href || pathname.startsWith(c.href + "/")) || pathname.startsWith(item.href + "/") || pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export function titleFor(pathname: string): string {
  if (pathname === "/profil") return "Profil Saya";
  for (const item of ALL_ITEMS) {
    const child = item.children?.find((c) => c.href === pathname);
    if (child) return child.label;
  }
  const hit = ALL_ITEMS.find((i) => (i.href === "/" ? pathname === "/" : pathname === i.href || pathname.startsWith(i.href + "/")));
  return hit?.label ?? "SAKALA";
}
