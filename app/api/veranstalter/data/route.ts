import { withEventSchedules } from '@/lib/event-schedules';
import { withTicketStats } from '@/lib/event-ticket-stats';
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
    .select('id,title,date,time,online_sale_ends_at')
    .eq('veranstalter_id', authedId)
    .order('date', { ascending: false })
    ;

  if (eventsError) {
    return NextResponse.json({ error: 'Events konnten nicht geladen werden.' }, { status: 500 });
  }

  try {
    const scheduled = await withEventSchedules(supabase, ev || []);
    const events = await withTicketStats(supabase, scheduled);
    return NextResponse.json({ veranstalter:v, events }, {headers:{'Cache-Control':'no-store'}});
  } catch { return NextResponse.json({error:'Ticketzahlen konnten nicht geladen werden.'},{status:503}); }
}
