import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRequest } from "@/lib/admin-auth";
import type { AnalyticsEntry } from '@/lib/analytics';

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
    supabase.from("tickets").select("event_id,event_title,amount,status").not("ticket_id", "like", "WOLNAA-GIVEAWAY-%"),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (eventsError) return NextResponse.json({ error: eventsError.message }, { status: 500 });
  if (ticketsError) return NextResponse.json({ error: ticketsError.message }, { status: 500 });
  const rows = Object.fromEntries((data ?? []).map(row => [row.key, row.value]));
  let summary: {days: Record<string,{views:number;visits:number}>;paths:Record<string,number>;referrers:Record<string,number>;devices:Record<string,number>} = {days:{},paths:{},referrers:{},devices:{}};
  let checkouts = {};
  try { if (rows.analytics_summary) summary = {...summary,...JSON.parse(rows.analytics_summary)}; } catch { return NextResponse.json({error:'Gespeicherte Besucherdaten sind beschädigt.'},{status:500}); }
  try { checkouts = rows.analytics_checkouts ? JSON.parse(rows.analytics_checkouts) : {}; } catch { checkouts = {}; }

  const paidTickets = (tickets ?? []).filter(ticket => ticket.status !== "cancelled");
  let wheelSpins = 0;
  const purchaseSources: Record<string,number> = {};
  for (let offset=0;;offset+=1000) {
    const {data:entries,error:entryError} = await supabase.from('settings').select('key,value').like('key','analytics_entry:%').order('key').range(offset,offset+999);
    if (entryError) return NextResponse.json({error:entryError.message},{status:500});
    for (const row of entries ?? []) {
      let entry: AnalyticsEntry;
      try { entry = JSON.parse(row.value); } catch { continue; }
      if (entry.kind === 'wheel') wheelSpins++;
      else if (entry.kind === 'purchase') { const source=entry.source || 'Direkt / unbekannt'; purchaseSources[source]=(purchaseSources[source] || 0)+(entry.count || 0); }
      else if (entry.kind === 'view') {
        const day=summary.days[entry.date] ?? {views:0,visits:0}; day.views++; if(entry.newVisit) day.visits++; summary.days[entry.date]=day;
        const path=entry.path || '/'; const source=entry.source || 'Direkt / unbekannt'; const device=entry.device || 'Desktop';
        summary.paths[path]=(summary.paths[path] || 0)+1; summary.referrers[source]=(summary.referrers[source] || 0)+1; summary.devices[device]=(summary.devices[device] || 0)+1;
      }
    }
    if (!entries || entries.length<1000) break;
  }
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

  return NextResponse.json({ ...EMPTY, ...summary, checkouts, events: eventMetrics, wheelSpins, purchaseSources },{headers:{'Cache-Control':'no-store'}});
}
