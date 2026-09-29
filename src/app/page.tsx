import Link from "next/link";
import { ArrowRight, Users, BookOpen, School, DoorOpen, Scale, CalendarDays } from "lucide-react";

const LANGKAH = [
  { href: "/guru", label: "Guru", icon: Users, ket: "Daftar guru dan ketersediaan" },
  { href: "/mapel", label: "Mapel", icon: BookOpen, ket: "Mata pelajaran dan warnanya" },
  { href: "/kelas", label: "Kelas", icon: School, ket: "Kelas dan rombel" },
  { href: "/ruang", label: "Ruang", icon: DoorOpen, ket: "Ruang dan kapasitas" },
  { href: "/beban-mengajar", label: "Beban Mengajar", icon: Scale, ket: "Guru, mapel, kelas, target JP" },
  { href: "/jadwal", label: "Jadwal", icon: CalendarDays, ket: "Susun dan periksa jadwal" },
];

export default function Beranda() {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-line-strong px-3 py-1 text-[0.8125rem] text-metal">
        Fondasi aplikasi · data belum diisi
      </p>
      <h1 className="text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.02em]">
        Belum ada jadwal yang disiapkan
      </h1>
      <p className="mt-3 max-w-[60ch] text-muted">
        Mulai dari data dasar: guru, mapel, kelas, dan ruang. Setelah beban mengajar terisi, jadwal bisa disusun dan diperiksa bentroknya.
      </p>

      <section aria-labelledby="langkah" className="mt-10">
        <h2 id="langkah" className="mb-4 text-[1.375rem] font-semibold tracking-tight">Isi data dasar</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LANGKAH.map(({ href, label, icon: Icon, ket }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex min-h-28 flex-col justify-between rounded-[var(--radius)] border border-line-strong bg-surface p-5 shadow-[var(--shadow-sm)] transition hover:-translate-y-px hover:shadow-[var(--shadow-md)]"
              >
                <Icon size={22} strokeWidth={1.75} aria-hidden className="text-brand" />
                <span>
                  <span className="flex items-center justify-between text-[1.125rem] font-medium">
                    {label}
                    <ArrowRight size={18} strokeWidth={1.75} aria-hidden className="text-muted transition group-hover:translate-x-0.5" />
                  </span>
                  <span className="block text-[0.9375rem] text-muted">{ket}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
