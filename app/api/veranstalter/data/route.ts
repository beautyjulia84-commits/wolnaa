import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthedVeranstalterId } from '@/lib/veranstalter-auth';

export async function GET(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { searchParams } = new URL(req.url);
  const authedId = getAuthedVeranstalterId(req);
  const vid = searchParams.get('vid');
  if (!authedId) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  if (vid && vid !== authedId) return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 });

  const { data: v } = await supabase.from('veranstalter').select('*').eq('id', authedId).single();
  if (!v) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

  const { data: ev, error: eventsError } = await supabase
    .from('events')
    .select('id,title,date')
    .eq('veranstalter_id', authedId)
    .order('date', { ascending: false })
    .limit(5);

  if (eventsError) {
    return NextResponse.json({ error: 'Events konnten nicht geladen werden.' }, { status: 500 });
  }

  const eventIds = (ev || []).map(event => event.id);
  const { data: tickets, error: ticketsError } = eventIds.length
    ? await supabase.from('tickets').select('event_id,amount,status').in('event_id', eventIds)
    : { data: [], error: null };

  if (ticketsError) {
    return NextResponse.json({ error: 'Ticketzahlen konnten nicht geladen werden.' }, { status: 500 });
  }

  const eventsWithStats = (ev || []).map(event => {
    const paidTickets = (tickets || []).filter(ticket => ticket.event_id === event.id && ticket.status !== 'cancelled');
    return {
      ...event,
      tickets_sold: paidTickets.length,
      total_revenue: Math.round(paidTickets.reduce((sum, ticket) => sum + Number(ticket.amount || 0), 0) * 100),
    };
  });

  return NextResponse.json(
    { veranstalter: v, events: eventsWithStats },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
