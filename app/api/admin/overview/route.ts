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
  const [{ data, error }, { data: events, error: eventsError }, { data: tickets, error: ticketsError }] = await Promise.all([
    supabase.from("settings").select("key,value").in("key", ["analytics_summary", "analytics_checkouts"]),
    supabase.from("events").select("id,title,slug").order("date", { ascending: false }),
    supabase.from("tickets").select("event_id,event_title,amount,status"),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (eventsError) return NextResponse.json({ error: eventsError.message }, { status: 500 });
  if (ticketsError) return NextResponse.json({ error: ticketsError.message }, { status: 500 });
  const rows = Object.fromEntries((data ?? []).map(row => [row.key, row.value]));
  let summary = {};
  let checkouts = {};
  try { summary = rows.analytics_summary ? JSON.parse(rows.analytics_summary) : {}; } catch { summary = {}; }
  try { checkouts = rows.analytics_checkouts ? JSON.parse(rows.analytics_checkouts) : {}; } catch { checkouts = {}; }

  const paidTickets = (tickets ?? []).filter(ticket => ticket.status !== "cancelled");
  const eventMetrics = (events ?? []).map(event => {
    const matching = paidTickets.filter(ticket =>
      ticket.event_id === event.id || (!ticket.event_id && ticket.event_title === event.title)
    );
    return {
      ...event,
      tickets_sold: matching.length,
      total_revenue: Math.round(matching.reduce((sum, ticket) => sum + Number(ticket.amount || 0), 0) * 100),
    };
  });

  return NextResponse.json({ ...EMPTY, ...summary, checkouts, events: eventMetrics });
}
