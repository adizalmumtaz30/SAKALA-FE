import type { Config } from "./MasterData";

const tokenVar = (t: unknown) => {
  const n = Number(String(t ?? "").replace("subject-", ""));
  return Number.isFinite(n) && n > 0 ? `var(--m${((n - 1) % 12) + 1})` : undefined;
};

const guru: Config = {
  title: "Guru", noun: "Guru", table: "teachers", scope: "school", orderBy: "name",
  lead: "Tambahkan guru satu per satu. Impor dari berkas akan tersedia di Import/Sinkronisasi.",
  searchKeys: ["name", "code", "short_name", "email", "phone"],
  cols: [
    { key: "name", label: "Nama" },
    { key: "code", label: "Kode", mono: true },
    { key: "email", label: "Email" },
    { key: "phone", label: "Telepon" },
    { key: "is_active", label: "Status", render: (r) => (r.is_active ? "Aktif" : "Nonaktif") },
  ],
  fields: [
    { key: "name", label: "Nama lengkap", required: true, placeholder: "Contoh: Siti Aminah, S.Pd" },
    { key: "code", label: "Kode", max: 20 },
    { key: "short_name", label: "Nama singkat", max: 30 },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Telepon", max: 30 },
    { key: "is_active", label: "Guru aktif", type: "bool" },
  ],
  usage: { table: "teaching_assignments", column: "teacher_id", text: (n) => `Guru ini memiliki ${n} beban mengajar.` },
};

const mapel: Config = {
  title: "Mapel", noun: "Mapel", table: "subjects", scope: "school", orderBy: "name",
  lead: "Tambahkan mata pelajaran. Warna ditetapkan otomatis dan tetap untuk setiap mapel.",
  searchKeys: ["name", "code", "short_name"],
  strip: (r) => tokenVar(r.color_token),
  cols: [
    { key: "name", label: "Mata pelajaran" },
    { key: "code", label: "Kode", mono: true },
    { key: "short_name", label: "Singkatan" },
    { key: "is_active", label: "Status", render: (r) => (r.is_active ? "Aktif" : "Nonaktif") },
  ],
  fields: [
    { key: "name", label: "Mata pelajaran", required: true, placeholder: "Contoh: Matematika" },
    { key: "code", label: "Kode", max: 20, placeholder: "MTK" },
    { key: "short_name", label: "Singkatan", max: 20 },
    { key: "is_active", label: "Mapel aktif", type: "bool" },
  ],
  derive: (_v, rows) => ({ color_token: `subject-${String((rows.length % 24) + 1).padStart(2, "0")}` }),
  usage: { table: "teaching_assignments", column: "subject_id", text: (n) => `Mapel ini dipakai pada ${n} beban mengajar.` },
};

const kelas: Config = {
  title: "Kelas", noun: "Kelas", table: "classes", scope: "year", orderBy: "name",
  lead: "Tambahkan kelas untuk tahun ajaran ini. Tingkat dipakai sebagai filter.",
  searchKeys: ["name", "code", "grade"],
  filter: { label: "Tingkat", all: "Semua Tingkat", value: (r) => String(r.grade ?? "") },
  cols: [
    { key: "name", label: "Kelas" },
    { key: "grade", label: "Tingkat" },
    { key: "code", label: "Kode", mono: true },
    { key: "capacity", label: "Kapasitas", mono: true },
    { key: "is_active", label: "Status", render: (r) => (r.is_active ? "Aktif" : "Nonaktif") },
  ],
  fields: [
    { key: "name", label: "Nama kelas", required: true, placeholder: "Contoh: 7A" },
    { key: "grade", label: "Tingkat", max: 20, placeholder: "Contoh: Kelas 7" },
    { key: "code", label: "Kode", max: 20 },
    { key: "capacity", label: "Kapasitas siswa", type: "number" },
    { key: "is_active", label: "Kelas aktif", type: "bool" },
  ],
  usage: { table: "teaching_assignment_classes", column: "class_id", text: (n) => `Kelas ini dipakai pada ${n} beban mengajar.` },
};

export const CONFIGS = { guru, mapel, kelas } as const;
export type Kind = keyof typeof CONFIGS;
