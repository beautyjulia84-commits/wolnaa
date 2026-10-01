import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { isAdminRequest } from '@/lib/admin-auth';
import { promoReportRow } from '@/lib/promo-report';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Bitte zuerst im Adminbereich anmelden.' }, { status: 401, headers });
  const q = req.nextUrl.searchParams;
  const code = (q.get('code') || '').trim().toLowerCase();
  const eventId = q.get('eventId') || '';
  const cursor = q.get('cursor') || undefined;
  const asOf = Number(q.get('asOf'));
  if (!/^[a-z0-9_-]{1,80}$/.test(code) || !/^[a-f0-9-]{36}$/.test(eventId) || (cursor && !/^cs_[a-zA-Z0-9_]{1,250}$/.test(cursor)) || !Number.isSafeInteger(asOf) || asOf <= 0 || asOf > Math.floor(Date.now() / 1000) + 60) {
    return NextResponse.json({ error: 'Ungültige Suchangaben.' }, { status: 400, headers });
  }
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { timeout: 20000, maxNetworkRetries: 1 });
    const page = await stripe.checkout.sessions.list({ limit: 100, status: 'complete', created: { lte: asOf }, starting_after: cursor, expand: ['data.payment_intent.latest_charge'] });
    const rows = page.data.map(session => promoReportRow(session, eventId, code)).filter(row => row !== null);
    return NextResponse.json({ rows, scanned: page.data.length, next: page.has_more ? page.data.at(-1)?.id : null }, { headers });
  } catch {
    return NextResponse.json({ error: 'Stripe-Auswertung fehlgeschlagen. Bitte erneut versuchen; es wurde kein vollständiges Ergebnis ermittelt.' }, { status: 502, headers });
  }
}
