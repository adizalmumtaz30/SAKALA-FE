import { Home, Users, BookOpen, School, DoorOpen, Scale, RefreshCw, CalendarDays, ClipboardCheck, BarChart3, History, Settings, type LucideIcon } from "lucide-react";

export type NavItem = { slug: string; href: string; label: string; icon: LucideIcon; hint: string };

export const NAV: NavItem[] = [
  { slug: "", href: "/", label: "Beranda", icon: Home, hint: "Kesiapan jadwal dan hal yang perlu dicek" },
  { slug: "guru", href: "/guru", label: "Guru", icon: Users, hint: "Data guru dan ketersediaan" },
  { slug: "mapel", href: "/mapel", label: "Mapel", icon: BookOpen, hint: "Mata pelajaran" },
  { slug: "kelas", href: "/kelas", label: "Kelas", icon: School, hint: "Kelas dan rombel" },
  { slug: "ruang", href: "/ruang", label: "Ruang", icon: DoorOpen, hint: "Ruang dan kapasitas" },
  { slug: "beban-mengajar", href: "/beban-mengajar", label: "Beban Mengajar", icon: Scale, hint: "Guru, mapel, kelas, dan target JP per minggu" },
  { slug: "import", href: "/import", label: "Import/Sinkronisasi", icon: RefreshCw, hint: "Masukkan dan sinkronkan data" },
  { slug: "jadwal", href: "/jadwal", label: "Jadwal", icon: CalendarDays, hint: "Schedule Canvas per kelas" },
  { slug: "absensi", href: "/absensi", label: "Absensi", icon: ClipboardCheck, hint: "Kehadiran guru" },
  { slug: "laporan", href: "/laporan", label: "Laporan", icon: BarChart3, hint: "Ringkasan dan ekspor" },
  { slug: "riwayat", href: "/riwayat", label: "Riwayat", icon: History, hint: "Versi jadwal dan perubahan" },
  { slug: "settings", href: "/settings", label: "Settings", icon: Settings, hint: "Tahun ajaran dan pengaturan" },
];
