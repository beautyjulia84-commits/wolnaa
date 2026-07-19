import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type VisitSummary = {
  days: Record<string, { views: number; visits: number }>;
  paths: Record<string, number>;
  referrers: Record<string, number>;
  devices: Record<string, number>;
  updatedAt?: string;
};

const EMPTY: VisitSummary = { days: {}, paths: {}, referrers: {}, devices: {} };

function clean(value: unknown, fallback: string, maxLength = 160) {
  return typeof value === "string" && value.trim()
    ? value.trim().replace(/[<>]/g, "").slice(0, maxLength)
    : fallback;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const path = clean(body.path, "/");
    if (["/admin", "/veranstalter", "/wolnaa-admin", "/api"].some(prefix => path.startsWith(prefix))) {
      return new NextResponse(null, { status: 204 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    const { data } = await supabase.from("settings").select("value").eq("key", "analytics_summary").maybeSingle();
    let summary: VisitSummary = structuredClone(EMPTY);
    if (data?.value) {
      try { summary = { ...summary, ...JSON.parse(data.value) }; }
      catch { /* Beschädigte Altdaten werden verworfen. */ }
    }

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
    const day = summary.days[today] ?? { views: 0, visits: 0 };
    day.views += 1;
    if (body.newVisit === true) day.visits += 1;
    summary.days[today] = day;

    const referrer = clean(body.referrer, "Direkt", 100);
    const device = body.device === "Mobil" ? "Mobil" : "Desktop";
    summary.paths[path] = (summary.paths[path] ?? 0) + 1;
    summary.referrers[referrer] = (summary.referrers[referrer] ?? 0) + 1;
    summary.devices[device] = (summary.devices[device] ?? 0) + 1;
    summary.updatedAt = new Date().toISOString();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 89);
    const cutoffKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(cutoff);
    summary.days = Object.fromEntries(Object.entries(summary.days).filter(([date]) => date >= cutoffKey));

    const { error } = await supabase.from("settings").upsert(
      { key: "analytics_summary", value: JSON.stringify(summary) },
      { onConflict: "key" },
    );
    if (error) console.error("Page counter storage failed:", error);
  } catch (error) {
    console.error("Page counter failed:", error);
  }
  return new NextResponse(null, { status: 204 });
}
