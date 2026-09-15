import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type TicketRow = {
  event_id: string | null;
  event_title: string | null;
  customer_email: string | null;
  created_at: string;
};

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: ticketRows, error } = await supabase
    .from("tickets")
    .select("event_id,event_title,customer_email,created_at")
    .in("status", ["paid", "checked_in"])
    .not("ticket_id", "like", "WOLNAA-GIVEAWAY-%")
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) {
    return NextResponse.json({ activities: [] }, { status: 200 });
  }

  const rows = (ticketRows || []) as TicketRow[];
  const eventIds = [...new Set(rows.map(row => row.event_id).filter((id): id is string => !!id))];
  const { data: events } = eventIds.length
    ? await supabase.from("events").select("id,title,slug,date").in("id", eventIds)
    : { data: [] };
  const eventMap = new Map((events || []).map(event => [event.id, event]));
  const today = new Date().toISOString().slice(0, 10);
  const grouped = new Map<string, { count: number; eventTitle: string; eventSlug: string | null; createdAt: string }>();

  for (const row of rows) {
    if (!row.event_id) continue;
    const event = eventMap.get(row.event_id);
    if (!event || (event.date && event.date < today)) continue;

    const key = `${row.customer_email || "guest"}|${row.event_id || row.event_title}|${row.created_at}`;
    const current = grouped.get(key);
    if (current) {
      current.count += 1;
      continue;
    }

    grouped.set(key, {
      count: 1,
      eventTitle: event?.title || row.event_title || "WOLNAA Event",
      eventSlug: event?.slug || null,
      createdAt: row.created_at,
    });
  }

  const activities = Array.from(grouped.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
    .map(({ count, eventTitle, eventSlug }) => ({ count, eventTitle, eventSlug }));

  return NextResponse.json(
    { activities },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
