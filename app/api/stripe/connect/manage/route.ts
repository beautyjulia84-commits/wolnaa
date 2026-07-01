import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getAuthedVeranstalterId } from '@/lib/veranstalter-auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const authedId = getAuthedVeranstalterId(req);
    if (!authedId) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: veranstalter } = await supabaseAdmin
      .from('veranstalter')
      .select('stripe_account_id')
      .eq('id', authedId)
      .single();

    if (!veranstalter?.stripe_account_id) {
      return NextResponse.json({ error: 'Kein Stripe-Konto verbunden.' }, { status: 400 });
    }

    const link = await stripe.accounts.createLoginLink(veranstalter.stripe_account_id);
    return NextResponse.json({ url: link.url });
  } catch (err) {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}
