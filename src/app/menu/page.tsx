import { Suspense } from "react";
import { DaftarMenu } from "./DaftarMenu";

export const metadata = { title: "Daftar Menu · SAKALA FE" };

export default function Page() {
  return (
    <>
      <h1 className="h1">Daftar Menu</h1>
      <p className="lead">Semua modul dalam satu halaman. Ketuk kartu untuk membuka.</p>
      <Suspense fallback={<div className="sk" style={{ width: "40%" }} />}><DaftarMenu /></Suspense>
    </>
  );
}
