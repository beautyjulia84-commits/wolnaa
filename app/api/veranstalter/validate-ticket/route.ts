import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthedVeranstalterId } from '@/lib/veranstalter-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const authedId = getAuthedVeranstalterId(req);
  const { ticketId, veranstalterId } = await req.json();

  if (!authedId) {
    return NextResponse.json({ valid: false, reason: 'Nicht angemeldet.' }, { status: 401 });
  }
  if (veranstalterId && veranstalterId !== authedId) {
    return NextResponse.json({ valid: false, reason: 'Kein Zugriff.' }, { status: 403 });
  }
  if (!ticketId) {
    return NextResponse.json({ valid: false, reason: 'Ticket-ID oder Veranstalter-ID fehlt.' }, { status: 400 });
  }

  const { data: veranstalter } = await supabase
    .from('veranstalter')
    .select('id, aktiv')
    .eq('id', authedId)
    .single();

  if (!veranstalter?.aktiv) {
    return NextResponse.json({ valid: false, reason: 'Veranstalter nicht aktiv.' }, { status: 403 });
  }

  const { data: ticket, error } = await supabase
    .from('tickets')
    .select('*, events:event_id(id,title,veranstalter_id)')
    .eq('ticket_id', ticketId)
    .single();

  if (error || !ticket) {
    return NextResponse.json({ valid: false, reason: 'Ticket nicht gefunden.' }, { status: 404 });
  }

  const event = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events;

  if (!event || event.veranstalter_id !== authedId) {
    return NextResponse.json({ valid: false, reason: 'Ticket gehört nicht zu deinen Events.' }, { status: 403 });
  }

  if (ticket.status === 'cancelled') {
    return NextResponse.json({ valid: false, reason: 'Ticket wurde storniert.' }, { status: 400 });
  }

  if (ticket.status === 'checked_in') {
    return NextResponse.json({
      valid: false,
      reason: 'Ticket bereits verwendet.',
      checkedInAt: ticket.checked_in_at,
      customerName: ticket.customer_name,
      eventTitle: ticket.event_title || event.title,
    }, { status: 409 });
  }

  await supabase
    .from('tickets')
    .update({ status: 'checked_in', checked_in_at: new Date().toISOString() })
    .eq('ticket_id', ticketId);

  return NextResponse.json({
    valid: true,
    customerName: ticket.customer_name,
    eventTitle: ticket.event_title || event.title,
    ticketName: ticket.ticket_name,
    amount: ticket.amount,
  });
}
