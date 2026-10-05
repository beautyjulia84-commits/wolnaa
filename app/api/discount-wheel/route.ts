import {withEventSchedules} from '@/lib/event-schedules';
import {eventTiming} from '@/lib/event-timing';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { recordAnalytics } from '@/lib/analytics';
import { claimWheelSpin } from '@/lib/wheel-counter';
import { drawReward, readReward, signReward, WHEEL_COOKIE, WHEEL_EVENT_ID, wheelCookieOptions } from '@/lib/discount-wheel';

export async function GET(req: Request) {
  return NextResponse.json({ reward: readReward(req) }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(req: Request) {
  const { eventId } = await req.json();
  if (eventId !== WHEEL_EVENT_ID) return NextResponse.json({ error: 'Diese Aktion gilt nur für Nürnberg.' }, { status: 400 });
  if (readReward(req)) return NextResponse.json({ error: 'In diesem Browser wurde bereits gedreht.' }, { status: 409 });
  const { data: event } = await supabase.from('events').select('id,date,time,online_sale_ends_at').eq('id', WHEEL_EVENT_ID).single();
  let scheduled;
  try { if(event) [scheduled] = await withEventSchedules(supabase,[event]); } catch { return NextResponse.json({error:'Zeitplan nicht verfügbar.'},{status:503}); }
  if (!scheduled || eventTiming(scheduled).salesClosed) {
    return NextResponse.json({ error: 'Die Aktion ist beendet.' }, { status: 400 });
  }
  let spinNumber: number;
  try {
    spinNumber = await claimWheelSpin(supabase);
  } catch {
    return NextResponse.json({ error: 'Das Rad ist gerade nicht verfügbar. Bitte erneut versuchen.' }, { status: 503 });
  }
  const reward = drawReward(spinNumber);
  // Analytics must not discard an already allocated reward (including the 70th).
  await recordAnalytics({kind:'wheel'}).catch(() => console.error('Wheel analytics could not be recorded'));
  const response = NextResponse.json({ reward });
  response.cookies.set(WHEEL_COOKIE, signReward(reward), wheelCookieOptions);
  return response;
}
