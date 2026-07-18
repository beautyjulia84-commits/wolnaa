import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthedVeranstalterId } from '@/lib/veranstalter-auth';

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
}

function eventToRow(event: any, veranstalter: any) {
  const firstTicket = Array.isArray(event.tickets) ? event.tickets[0] : null;

  return {
    title: event.title,
    slug: event.id ? undefined : `${slugify(event.title)}-${Date.now().toString(36)}`,
    city: event.city || '',
    date: event.date,
    time: event.time || '',
    online_sale_ends_at: event.onlineSaleEndsAt ? new Date(event.onlineSaleEndsAt).toISOString() : null,
    location: event.location || '',
    address: event.address || '',
    image_url: event.imageUrl || '',
    price: firstTicket?.price || '',
    description: event.description || '',
    tickets: Array.isArray(event.tickets) ? event.tickets : [],
    lounges: !!event.lounges,
    lounge_list: Array.isArray(event.loungeList) ? event.loungeList : [],
    discount_codes: Array.isArray(event.discountCodes) ? event.discountCodes : [],
    veranstalter_id: veranstalter.id,
    stripe_account_id: veranstalter.stripe_account_id || null,
  };
}

async function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function getVeranstalter(supabase: any, id: string) {
  const { data, error } = await supabase
    .from('veranstalter')
    .select('id, stripe_account_id, aktiv')
    .eq('id', id)
    .single();

  if (error || !data || !data.aktiv) return null;
  return data;
}

export async function GET(req: Request) {
  const supabase = await getSupabase();
  const { searchParams } = new URL(req.url);
  const authedId = getAuthedVeranstalterId(req);
  const vid = searchParams.get('vid');
  const id = searchParams.get('id');

  if (!authedId) return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  if (vid && vid !== authedId) return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 });

  const veranstalter = await getVeranstalter(supabase, authedId);
  if (!veranstalter) return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 });

  if (id) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('veranstalter_id', authedId)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Event nicht gefunden.' }, { status: 404 });
    return NextResponse.json({ event: data });
  }

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('veranstalter_id', authedId)
    .order('date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    { events: data || [] },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: Request) {
  const supabase = await getSupabase();

  try {
    const authedId = getAuthedVeranstalterId(req);
    const { veranstalterId, event } = await req.json();
    if (!authedId) return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    if (veranstalterId && veranstalterId !== authedId) return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 });
    if (!event?.title || !event?.date) return NextResponse.json({ error: 'Titel und Datum sind Pflichtfelder.' }, { status: 400 });

    const veranstalter = await getVeranstalter(supabase, authedId);
    if (!veranstalter) return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 });

    const row = eventToRow(event, veranstalter);
    const { data, error } = await supabase.from('events').insert(row).select('id').single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, id: data.id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Event konnte nicht gespeichert werden.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const supabase = await getSupabase();

  try {
    const authedId = getAuthedVeranstalterId(req);
    const { veranstalterId, event } = await req.json();
    if (!authedId) return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    if (veranstalterId && veranstalterId !== authedId) return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 });
    if (!event?.id) return NextResponse.json({ error: 'Event-ID fehlt.' }, { status: 400 });
    if (!event?.title || !event?.date) return NextResponse.json({ error: 'Titel und Datum sind Pflichtfelder.' }, { status: 400 });

    const veranstalter = await getVeranstalter(supabase, authedId);
    if (!veranstalter) return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 });

    const row = eventToRow(event, veranstalter);
    delete (row as any).slug;

    const { error } = await supabase
      .from('events')
      .update(row)
      .eq('id', event.id)
      .eq('veranstalter_id', authedId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Event konnte nicht gespeichert werden.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const supabase = await getSupabase();
  const authedId = getAuthedVeranstalterId(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!authedId) return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  if (!id) return NextResponse.json({ error: 'Event-ID fehlt.' }, { status: 400 });

  const veranstalter = await getVeranstalter(supabase, authedId);
  if (!veranstalter) return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 });

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, tickets_sold')
    .eq('id', id)
    .eq('veranstalter_id', authedId)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event nicht gefunden oder kein Zugriff.' }, { status: 404 });
  }
  if ((event.tickets_sold || 0) > 0) {
    return NextResponse.json(
      { error: 'Events mit verkauften Tickets können nicht gelöscht werden.' },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
    .eq('veranstalter_id', authedId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
