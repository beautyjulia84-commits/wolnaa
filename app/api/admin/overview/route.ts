import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRequest } from "@/lib/admin-auth";

const EMPTY = { days: {}, paths: {}, referrers: {}, devices: {}, checkouts: {}, events: [] };

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const [{ data, error }, { data: events, error: eventsError }] = await Promise.all([
    supabase.from("settings").select("key,value").in("key", ["analytics_summary", "analytics_checkouts"]),
    supabase.from("events").select("id,title,slug,tickets_sold,total_revenue").order("date", { ascending: false }),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (eventsError) return NextResponse.json({ error: eventsError.message }, { status: 500 });
  const rows = Object.fromEntries((data ?? []).map(row => [row.key, row.value]));
  let summary = {};
  let checkouts = {};
  try { summary = rows.analytics_summary ? JSON.parse(rows.analytics_summary) : {}; } catch { summary = {}; }
  try { checkouts = rows.analytics_checkouts ? JSON.parse(rows.analytics_checkouts) : {}; } catch { checkouts = {}; }
  return NextResponse.json({ ...EMPTY, ...summary, checkouts, events: events ?? [] });
}
