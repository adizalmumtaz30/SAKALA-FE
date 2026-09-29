import { notFound } from "next/navigation";
import { NAV } from "@/components/shell/nav";

export function generateStaticParams() {
  return NAV.filter((n) => n.slug).map((n) => ({ section: n.slug }));
}

export const dynamicParams = false;

export default async function Bagian({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const item = NAV.find((n) => n.slug === section);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.02em]">
        {item.label}
      </h1>
      <p className="mt-3 text-muted">{item.hint}.</p>
      <div className="mt-8 rounded-[var(--radius)] border border-dashed border-line-strong bg-surface p-6">
        <p className="text-[1.125rem] font-medium">Halaman ini belum dibangun</p>
        <p className="mt-1 text-muted">
          Modul {item.label} dikerjakan pada tahap berikutnya sesuai urutan build.
        </p>
      </div>
    </div>
  );
}
