import { notFound } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { ALL_ITEMS } from "@/components/shell/nav";

const PATHS = ALL_ITEMS.flatMap((i) => [i.href, ...(i.children?.map((c) => c.href) ?? [])]).filter((p) => !["/", "/menu", "/guru", "/mapel", "/kelas"].includes(p));

export function generateStaticParams() {
  return PATHS.map((p) => ({ slug: p.split("/").filter(Boolean) }));
}
export const dynamicParams = false;

export default async function Bagian({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = "/" + slug.join("/");
  const item = ALL_ITEMS.find((i) => i.href === path || i.children?.some((c) => c.href === path));
  if (!item || !PATHS.includes(path)) notFound();
  const label = item.children?.find((c) => c.href === path)?.label ?? item.label;
  return (
    <>
      <h1 className="h1">{label}</h1>
      <p className="lead">{item.hint}.</p>
      <section className="card">
        <div className="emp">
          <CalendarClock aria-hidden />
          <b>Modul ini belum dibangun</b>
          <p>{label} dikerjakan pada tahap berikutnya sesuai urutan build. Desainnya sudah divalidasi pada prototipe.</p>
        </div>
      </section>
    </>
  );
}
