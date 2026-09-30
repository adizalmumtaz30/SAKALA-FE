import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const envOk = Boolean(url && key);
  let supabase: "ok" | "error" | "belum-dikonfigurasi" = "belum-dikonfigurasi";
  let detail: string | undefined;

  if (envOk) {
    try {
      // Root /rest/v1/ butuh secret key; publishable key hanya boleh query tabel yang punya policy.
      const res = await fetch(`${url}/rest/v1/schools?select=id&limit=1`, {
        headers: { apikey: key as string },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      supabase = res.ok ? "ok" : "error";
      if (!res.ok) detail = `HTTP ${res.status}`;
    } catch {
      supabase = "error";
      detail = "tidak dapat menjangkau Supabase";
    }
  }

  return NextResponse.json(
    {
      app: "sakala-fe",
      status: supabase === "error" ? "degraded" : "ok",
      env: { supabaseUrl: Boolean(url), publishableKey: Boolean(key) },
      supabase,
      ...(detail ? { detail } : {}),
      time: new Date().toISOString(),
    },
    { status: supabase === "error" ? 503 : 200 },
  );
}
