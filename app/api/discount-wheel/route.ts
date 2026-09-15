import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { drawReward, readReward, signReward, WHEEL_COOKIE, WHEEL_EVENT_ID, wheelCookieOptions } from '@/lib/discount-wheel';

export async function GET(req: Request) {
  return NextResponse.json({ reward: readReward(req) }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(req: Request) {
  const { eventId } = await req.json();
  if (eventId !== WHEEL_EVENT_ID) return NextResponse.json({ error: 'Diese Aktion gilt nur für Nürnberg.' }, { status: 400 });
  if (readReward(req)) return NextResponse.json({ error: 'In diesem Browser wurde bereits gedreht.' }, { status: 409 });
  const { data: event } = await supabase.from('events').select('date,online_sale_ends_at').eq('id', WHEEL_EVENT_ID).single();
  if (!event || event.date < new Date().toISOString().slice(0, 10) || (event.online_sale_ends_at && new Date(event.online_sale_ends_at).getTime() <= Date.now())) {
    return NextResponse.json({ error: 'Die Aktion ist beendet.' }, { status: 400 });
  }
  const reward = drawReward();
  const response = NextResponse.json({ reward });
  response.cookies.set(WHEEL_COOKIE, signReward(reward), wheelCookieOptions);
  return response;
}
