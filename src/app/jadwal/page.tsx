import { Canvas } from "@/features/canvas/Canvas";

export const metadata = { title: "Schedule Canvas · SAKALA FE" };

export default function Page() {
  return (
    <>
      <h1 className="h1">Schedule Canvas</h1>
      <p className="lead">Susun jadwal per kelas. Database menolak bentrok guru dan kelas.</p>
      <Canvas />
    </>
  );
}
