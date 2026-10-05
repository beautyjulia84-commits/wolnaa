import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/admin-auth';
import { getAuthedVeranstalterId } from '@/lib/veranstalter-auth';
import { promoReportRow } from '@/lib/promo-report';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = isAdminRequest(req);
  const ownerId = getAuthedVeranstalterId(req);
  if (!admin && !ownerId) return NextResponse.json({ error: 'Bitte zuerst anmelden.' }, { status: 401, headers });
  const { id } = await ctx.params;
  const cursor = req.nextUrl.searchParams.get('cursor') || undefined;
  const asOf = Number(req.nextUrl.searchParams.get('asOf'));
  if (!/^[a-f0-9-]{36}$/.test(id) || (cursor && !/^cs_[a-zA-Z0-9_]{1,250}$/.test(cursor)) || !Number.isSafeInteger(asOf) || asOf <= 0 || asOf > Math.floor(Date.now() / 1000) + 60) {
    return NextResponse.json({ error: 'Ungültige Suchangaben.' }, { status: 400, headers });
  }
  // Ownership is checked before Stripe is queried, on every pagination request.
  let query = supabase.from('events').select('id').eq('id', id);
  if (!admin) query = query.eq('veranstalter_id', ownerId!);
  const { data: event, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ error: 'Event konnte nicht geprüft werden.' }, { status: 503, headers });
  if (!event) return NextResponse.json({ error: 'Event nicht gefunden oder kein Zugriff.' }, { status: 404, headers });
  if (!admin) {
    const { data: owner } = await supabase.from('veranstalter').select('aktiv').eq('id', ownerId!).maybeSingle();
    if (!owner?.aktiv) return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403, headers });
  }
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { timeout: 20000, maxNetworkRetries: 1 });
    const page = await stripe.checkout.sessions.list({ limit: 100, status: 'complete', created: { lte: asOf }, starting_after: cursor, expand: ['data.payment_intent.latest_charge'] });
    const rows = page.data.map(session => promoReportRow(session, id)).filter(row => row !== null);
    return NextResponse.json({ rows, next: page.has_more ? page.data.at(-1)?.id : null }, { headers });
  } catch {
    return NextResponse.json({ error: 'Promocode-Auswertung konnte nicht vollständig geladen werden. Bitte erneut versuchen.' }, { status: 502, headers });
  }
}
