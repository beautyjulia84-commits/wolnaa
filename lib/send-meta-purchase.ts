import type Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { buildMetaPurchase } from './meta-purchase';

export async function sendMetaPurchase(session: Stripe.Checkout.Session, eventTime: number) {
  const token = process.env.META_CONVERSIONS_ACCESS_TOKEN;
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!token || !pixel || process.env.META_PURCHASE_TRACKING_ENABLED !== 'true') return;
  const purchase = buildMetaPurchase(session,eventTime);
  if (!purchase) return;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const key = 'meta_sent:' + purchase.event_id;
  const {data,error} = await db.from('settings').select('value').eq('key',key).maybeSingle();
  if (error) throw new Error('Meta delivery status could not be read');
  if (data) return;
  // Meta deduplicates retries by event_id. Do not replay uncertain deliveries outside its 48-hour window.
  if (Date.now()/1000 - eventTime > 47*60*60) {
    console.error('Meta purchase delivery expired', purchase.event_id);
    return;
  }
  const response = await fetch(`https://graph.facebook.com/v25.0/${pixel}/events`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({data:[purchase],access_token:token}),
    signal:AbortSignal.timeout(10000),
  });
  const result = await response.json();
  if (!response.ok || result.events_received !== 1) {
    // Never log tokens, matching identifiers or response bodies containing request data.
    throw new Error(`Meta purchase rejected: HTTP ${response.status}, code ${Number(result.error?.code)||0}`);
  }
  const saved = await db.from('settings').upsert({key,value:JSON.stringify({sentAt:new Date().toISOString()})},{onConflict:'key'});
  if (saved.error) throw new Error('Meta delivery status could not be saved');
}
