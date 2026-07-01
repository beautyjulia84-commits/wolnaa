import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('account_id');
  const base = `${process.env.NEXT_PUBLIC_APP_URL}/veranstalter/einstellungen`;

  if (!accountId) {
    return NextResponse.redirect(`${base}?error=connect_failed`);
  }

  try {
    const account = await stripe.accounts.retrieve(accountId);

    await supabaseAdmin
      .from('veranstalter')
      .update({
        stripe_account_id: accountId,
        stripe_charges_enabled: account.charges_enabled,
        stripe_onboarded_at: account.charges_enabled ? new Date().toISOString() : null,
      })
      .eq('stripe_account_id', accountId);

    return NextResponse.redirect(`${base}?success=stripe_connected`);
  } catch (err) {
    console.error('Stripe Express callback error:', err);
    return NextResponse.redirect(`${base}?error=connect_failed`);
  }
}
