import type Stripe from 'stripe';

export function promoReportRow(session: Stripe.Checkout.Session, eventId: string, code = '') {
  const meta = session.metadata || {};
  if (!session.livemode || session.status !== 'complete' || session.payment_status !== 'paid' || meta.eventId !== eventId) return null;
  const codes = (meta.discountCode || '').split('+').map(value => value.trim().toLowerCase());
  if (code && !codes.includes(code.trim().toLowerCase())) return null;
  let tickets: number | null = null;
  try {
    const items = JSON.parse(meta.lineItems || 'null');
    if (Array.isArray(items) && items.length && items.every(item => Number.isSafeInteger(item.qty) && item.qty > 0)) {
      tickets = items.reduce((sum, item) => sum + item.qty, 0);
    }
  } catch { /* Older orders without valid quantities remain explicitly unknown. */ }
  const intent = session.payment_intent;
  const charge = intent && typeof intent !== 'string' ? intent.latest_charge : null;
  const refund = charge && typeof charge !== 'string'
    ? charge.refunded ? 'full' : charge.amount_refunded > 0 ? 'partial' : 'none'
    : 'unknown';
  return { id: session.id, created: session.created, code: meta.discountCode, tickets, refund,
    amount: session.amount_total, currency: session.currency };
}
