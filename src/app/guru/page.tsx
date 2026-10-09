import { MasterData } from "@/features/master/MasterData";

export const metadata = { title: "Guru · SAKALA FE" };

export default function Page() {
  return (
    <>
      <h1 className="h1">Guru</h1>
      <p className="lead">Data guru dan tenaga kependidikan.</p>
      <MasterData kind="guru" />
    </>
  );
}
