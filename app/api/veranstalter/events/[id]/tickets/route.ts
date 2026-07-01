import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthedVeranstalterId } from '@/lib/veranstalter-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function assertEventAccess(eventId: string, veranstalterId: string) {
  const { data: event, error } = await supabase
    .from('events')
    .select('id,title,date,location,veranstalter_id')
    .eq('id', eventId)
    .eq('veranstalter_id', veranstalterId)
    .single();

  if (error || !event) return null;
  return event;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const authedId = getAuthedVeranstalterId(req);
  const veranstalterId = searchParams.get('vid');

  if (!authedId) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }
  if (veranstalterId && veranstalterId !== authedId) {
    return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 });
  }

  const event = await assertEventAccess(id, authedId);
  if (!event) {
    return NextResponse.json({ error: 'Kein Zugriff auf dieses Event.' }, { status: 403 });
  }

  const { data: linkedTickets, error: linkedError } = await supabase
    .from('tickets')
    .select('*')
    .eq('event_id', id)
    .order('created_at', { ascending: false });

  if (linkedError) {
    return NextResponse.json({ error: linkedError.message }, { status: 500 });
  }

  // Older orders may have been saved only with event_title, before event_id was reliable.
  const { data: legacyTickets, error: legacyError } = await supabase
    .from('tickets')
    .select('*')
    .is('event_id', null)
    .eq('event_title', event.title)
    .order('created_at', { ascending: false });

  if (legacyError) {
    return NextResponse.json({ error: legacyError.message }, { status: 500 });
  }

  const byId = new Map<string, any>();
  for (const ticket of [...(linkedTickets || []), ...(legacyTickets || [])]) {
    byId.set(ticket.id, ticket);
  }

  const tickets = Array.from(byId.values()).sort((a, b) =>
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );

  return NextResponse.json({ event, tickets });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const authedId = getAuthedVeranstalterId(req);
  const { veranstalterId, ticketId, checkedIn } = await req.json();

  if (!authedId) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }
  if (veranstalterId && veranstalterId !== authedId) {
    return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 });
  }
  if (!ticketId) {
    return NextResponse.json({ error: 'Daten fehlen.' }, { status: 400 });
  }

  const event = await assertEventAccess(id, authedId);
  if (!event) {
    return NextResponse.json({ error: 'Kein Zugriff auf dieses Event.' }, { status: 403 });
  }

  const { data: ticket } = await supabase
    .from('tickets')
    .select('id,event_id,event_title')
    .eq('id', ticketId)
    .single();

  const belongsToEvent =
    ticket?.event_id === id ||
    (!ticket?.event_id && ticket?.event_title === event.title);

  if (!belongsToEvent) {
    return NextResponse.json({ error: 'Kein Zugriff auf dieses Ticket.' }, { status: 403 });
  }

  const status = checkedIn ? 'checked_in' : 'paid';

  const { error } = await supabase
    .from('tickets')
    .update({
      status,
      checked_in_at: checkedIn ? new Date().toISOString() : null,
    })
    .eq('id', ticketId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
