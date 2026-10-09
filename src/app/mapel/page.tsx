import { MasterData } from "@/features/master/MasterData";

export const metadata = { title: "Mapel · SAKALA FE" };

export default function Page() {
  return (
    <>
      <h1 className="h1">Mapel</h1>
      <p className="lead">Mata pelajaran dan warnanya.</p>
      <MasterData kind="mapel" />
    </>
  );
}
