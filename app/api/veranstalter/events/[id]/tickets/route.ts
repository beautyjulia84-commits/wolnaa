import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  const veranstalterId = searchParams.get('vid');

  if (!veranstalterId) {
    return NextResponse.json({ error: 'Veranstalter-ID fehlt.' }, { status: 400 });
  }

  const event = await assertEventAccess(id, veranstalterId);
  if (!event) {
    return NextResponse.json({ error: 'Kein Zugriff auf dieses Event.' }, { status: 403 });
  }

  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('event_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event, tickets: tickets || [] });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { veranstalterId, ticketId, checkedIn } = await req.json();

  if (!veranstalterId || !ticketId) {
    return NextResponse.json({ error: 'Daten fehlen.' }, { status: 400 });
  }

  const event = await assertEventAccess(id, veranstalterId);
  if (!event) {
    return NextResponse.json({ error: 'Kein Zugriff auf dieses Event.' }, { status: 403 });
  }

  const status = checkedIn ? 'checked_in' : 'paid';

  const { error } = await supabase
    .from('tickets')
    .update({
      status,
      checked_in_at: checkedIn ? new Date().toISOString() : null,
    })
    .eq('id', ticketId)
    .eq('event_id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
