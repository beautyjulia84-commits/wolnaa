import {withEventSchedules} from '@/lib/event-schedules';
import {eventTiming} from '@/lib/event-timing';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTicketPhase } from '@/lib/ticket-phases';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [{ data: event, error: eventError }, { data: soldRows, error: soldError }] = await Promise.all([
    supabase.from('events').select('id,date,time,online_sale_ends_at,tickets').eq('id', id).single(),
    supabase.from('tickets').select('ticket_name,status').eq('event_id', id),
  ]);

  if (eventError || !event) return NextResponse.json({ error: 'Event nicht gefunden.' }, { status: 404 });
  if (soldError) return NextResponse.json({ error: 'Verfügbarkeit konnte nicht geladen werden.' }, { status: 500 });

  let scheduled;
  try { [scheduled] = await withEventSchedules(supabase,[event]); } catch { return NextResponse.json({error:'Zeitplan nicht verfügbar.'},{status:503}); }
  const timing = eventTiming(scheduled);
  const tickets = Array.isArray(event.tickets) ? event.tickets : [];
  const phase = getTicketPhase(tickets, soldRows || []);

  return NextResponse.json({
    activeIndex: timing.salesClosed ? -1 : phase.activeIndex,
    activeTicket: timing.salesClosed ? null : phase.activeTicket,
    remaining: phase.remaining,
    salesClosed: timing.salesClosed,
    eventEnded: timing.ended,
    soldOut: phase.activeIndex < 0,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
