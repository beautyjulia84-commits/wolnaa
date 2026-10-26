import type Stripe from 'stripe';

export function adSale(session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  if (!session.livemode || session.status !== 'complete' || session.payment_status !== 'paid' || !meta.eventId || !meta.ticketId || session.mode !== 'payment') return null;
  let tickets: number | null = null;
  try {
    const items = JSON.parse(meta.lineItems || 'null');
    if (Array.isArray(items) && items.length && items.every(item => Number.isSafeInteger(item.qty) && item.qty > 0)) tickets = items.reduce((sum, item) => sum + item.qty, 0);
  } catch { /* Never estimate missing historic quantities. */ }
  const intent = session.payment_intent;
  const charge = intent && typeof intent !== 'string' ? intent.latest_charge : null;
  const refund = charge && typeof charge !== 'string' ? charge.refunded ? 'full' : charge.amount_refunded > 0 ? 'partial' : 'none' : 'unknown';
  const refunded = charge && typeof charge !== 'string' ? charge.amount_refunded : null;
  const source = meta.acquisitionSource || 'Nicht zugeordnet';
  const medium = meta.acquisitionMedium || '';
  return { id:session.id, created:session.created, eventId:meta.eventId, eventTitle:meta.eventTitle || meta.eventId,
    source, medium, campaign:meta.acquisitionCampaign || '', content:meta.acquisitionContent || '',
    paidAd:/^(paid_social|cpc|ppc|paid|display|cpm)$/i.test(medium),
    tickets, refund, amount:session.amount_total ?? 0, refunded, currency:session.currency || 'eur' };
}
export type AdSale = NonNullable<ReturnType<typeof adSale>>;

export function summarizeAdSales(rows: AdSale[]) {
  const groups = new Map<string, {eventTitle:string;source:string;campaign:string;content:string;currency:string;paidAd:boolean;tickets:number;orders:number;revenue:number;uncertain:number;refunded:number}>();
  for (const row of new Map(rows.map(row => [row.id,row])).values()) {
    const key = JSON.stringify([row.eventId,row.source,row.medium,row.campaign,row.content,row.currency]);
    const group = groups.get(key) || {eventTitle:row.eventTitle,source:row.source,campaign:row.campaign,content:row.content,currency:row.currency,paidAd:row.paidAd,tickets:0,orders:0,revenue:0,uncertain:0,refunded:0};
    group.orders++;
    if (row.refund === 'full') group.refunded += row.tickets || 0;
    else if (row.refund === 'none' && row.tickets !== null) group.tickets += row.tickets;
    else group.uncertain++;
    if (row.refunded !== null) group.revenue += Math.max(0,row.amount-row.refunded);
    groups.set(key,group);
  }
  return [...groups.values()].sort((a,b) => b.tickets-a.tickets);
}
