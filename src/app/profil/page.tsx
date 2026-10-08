import { Profil } from "./Profil";

export const metadata = { title: "Profil Saya · SAKALA FE" };

export default function Page() {
  return (
    <>
      <h1 className="h1">Profil Saya</h1>
      <p className="lead">Nama operator hanya tersimpan di browser ini (bukan akun).</p>
      <Profil />
    </>
  );
}
