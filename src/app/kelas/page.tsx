import { MasterData } from "@/features/master/MasterData";

export const metadata = { title: "Kelas · SAKALA FE" };

export default function Page() {
  return (
    <>
      <h1 className="h1">Kelas</h1>
      <p className="lead">Kelas dan rombel per tahun ajaran.</p>
      <MasterData kind="kelas" />
    </>
  );
}
