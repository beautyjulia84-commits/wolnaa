import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { isAdminRequest } from '@/lib/admin-auth';
import { adSale } from '@/lib/ad-sales';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
const headers = {'Cache-Control':'private, no-store'};
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({error:'Bitte zuerst anmelden.'},{status:401,headers});
  const q = req.nextUrl.searchParams;
  const from = Number(q.get('from')), to = Number(q.get('to'));
  const cursor = q.get('cursor') || undefined;
  if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from <= 0 || to < from || to-from > 366*86400 || to > Math.floor(Date.now()/1000)+60 || (cursor && !/^cs_[a-zA-Z0-9_]{1,250}$/.test(cursor))) return NextResponse.json({error:'Bitte einen gültigen Zeitraum bis maximal ein Jahr wählen.'},{status:400,headers});
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!,{timeout:20000,maxNetworkRetries:1});
    const page = await stripe.checkout.sessions.list({limit:100,status:'complete',created:{gte:from,lte:to},starting_after:cursor,expand:['data.payment_intent.latest_charge']});
    return NextResponse.json({rows:page.data.map(adSale).filter(Boolean),next:page.has_more ? page.data.at(-1)?.id : null},{headers});
  } catch { return NextResponse.json({error:'Zahlungsdaten konnten nicht vollständig geladen werden. Bitte erneut versuchen.'},{status:502,headers}); }
}
