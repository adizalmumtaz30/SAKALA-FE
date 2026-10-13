import { Struktur } from "@/features/struktur/Struktur";

export const metadata = { title: "Setting Jadwal · SAKALA FE" };

export default function Page() {
  return (
    <>
      <h1 className="h1">Setting Jadwal</h1>
      <p className="lead">Struktur Waktu: jam pelajaran, istirahat, dan kegiatan per hari. Jam ke- dihitung otomatis.</p>
      <Struktur />
    </>
  );
}
