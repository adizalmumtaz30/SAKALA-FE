export type SlotType = "TEACHING" | "BREAK" | "ACTIVITY";
export type Slot = { id: string; day_of_week: number; sequence_no: number; slot_type: SlotType; label: string | null; starts_at: string; ends_at: string; jam_ke: number | null };
export type Draft = { slot_type: SlotType; label: string | null; starts_at: string; ends_at: string };

export const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const TYPE_LABEL: Record<SlotType, string> = { TEACHING: "Pelajaran", BREAK: "Istirahat", ACTIVITY: "Kegiatan" };

export const toMin = (t: string) => { const [h, m] = t.slice(0, 5).split(":").map(Number); return h * 60 + m; };
export const toTime = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
export const hhmm = (t: string) => t.slice(0, 5);
// Urutan slot dalam sehari mengikuti jam mulai; nomor urut = menit sejak 00:00 + 1 (unik per hari selama tidak tumpang tindih).
export const seqOf = (start: string) => toMin(start) + 1;

export function generate(start: string, dur: number, count: number, breaks: { after: number; min: number }[]): Draft[] {
  const out: Draft[] = [];
  let t = toMin(start);
  for (let i = 1; i <= count; i++) {
    out.push({ slot_type: "TEACHING", label: null, starts_at: toTime(t), ends_at: toTime(t + dur) });
    t += dur;
    const b = breaks.find((x) => x.after === i);
    if (b && b.min > 0 && i < count) { out.push({ slot_type: "BREAK", label: "Istirahat", starts_at: toTime(t), ends_at: toTime(t + b.min) }); t += b.min; }
  }
  return out;
}

export function overlaps(list: { starts_at: string; ends_at: string }[], d: { starts_at: string; ends_at: string }) {
  const a = toMin(d.starts_at), b = toMin(d.ends_at);
  return list.some((x) => a < toMin(x.ends_at) && toMin(x.starts_at) < b);
}

export const countTeaching = (l: { slot_type: SlotType }[]) => l.filter((s) => s.slot_type === "TEACHING").length;
