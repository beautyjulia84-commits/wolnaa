import { createHash } from 'node:crypto';
import type Stripe from 'stripe';

export const META_CONSENT_VERSION = '2';
export function metaCheckoutMetadata(req: Request): Record<string, string> {
  const cookies = Object.fromEntries((req.headers.get('cookie') || '').split(';').map(part => {
    const index = part.indexOf('=');
    return index < 0 ? ['', ''] : [part.slice(0,index).trim(), part.slice(index+1)];
  }));
  if (cookies['wolnaa-meta-consent'] !== META_CONSENT_VERSION) return {};
  const fbp = /^fb\.\d+\.\d{13}\.\d+$/.test(cookies._fbp || '') ? cookies._fbp.slice(0,200) : '';
  const fbc = /^fb\.\d+\.\d{13}\.[A-Za-z0-9_-]+$/.test(cookies._fbc || '') ? cookies._fbc.slice(0,490) : '';
  if (!fbp && !fbc) return {};
  return {metaConsent: META_CONSENT_VERSION, metaFbp: fbp, metaFbc: fbc, metaUserAgent: (req.headers.get('user-agent') || '').slice(0,490)};
}

export function buildMetaPurchase(session: Stripe.Checkout.Session, eventTime: number) {
  const meta = session.metadata || {};
  if (!session.livemode || session.payment_status !== 'paid' || session.mode !== 'payment' ||
      !session.amount_total || session.amount_total <= 0 || meta.metaConsent !== META_CONSENT_VERSION ||
      (!meta.metaFbp && !meta.metaFbc) || !meta.metaUserAgent || !session.currency) return null;
  // Only the verified Stripe webhook's payment timestamp is used, never browser input.
  if (!Number.isSafeInteger(eventTime) || eventTime <= 0) return null;
  const quantity = Number(meta.metaTicketCount);
  if (!Number.isSafeInteger(quantity) || quantity <= 0) return null;
  const eventId = 'purchase_' + createHash('sha256').update(session.id).digest('hex');
  return {
    event_name: 'Purchase', event_time: eventTime, event_id: eventId,
    action_source: 'website', event_source_url: 'https://www.wolnaa.de/success',
    user_data: {
      ...(meta.metaFbp ? {fbp:meta.metaFbp} : {}),
      ...(meta.metaFbc ? {fbc:meta.metaFbc} : {}),
      client_user_agent: meta.metaUserAgent,
    },
    custom_data: {currency:session.currency.toUpperCase(), value:session.amount_total / 100, num_items:quantity, order_id:eventId},
  };
}
