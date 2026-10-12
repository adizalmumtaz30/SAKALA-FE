import { Beban } from "@/features/beban/Beban";

export const metadata = { title: "Beban Mengajar · SAKALA FE" };

export default function Page() {
  return (
    <>
      <h1 className="h1">Beban Mengajar</h1>
      <p className="lead">Guru, mapel, kelas, dan JP per minggu dalam satu input.</p>
      <Beban />
    </>
  );
}
