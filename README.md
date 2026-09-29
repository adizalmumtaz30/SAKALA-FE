# SAKALA FE

Workspace operasional untuk menyiapkan, menghasilkan, memeriksa, dan memperbaiki jadwal sekolah.

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local   # isi nilai Supabase, jangan di-commit
npm run dev
```

## Variabel lingkungan

Lihat `.env.example`. Hanya `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` yang boleh tampil di browser. Kunci rahasia hanya untuk server dan tidak boleh diberi prefix `NEXT_PUBLIC_`.

## Pengecekan

```bash
npm run lint
npm run build
```

Endpoint `/api/health` melaporkan status aplikasi dan koneksi Supabase tanpa membocorkan nilai rahasia.
