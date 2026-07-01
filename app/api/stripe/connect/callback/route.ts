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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const base = `${appUrl}/veranstalter/einstellungen`;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const stripeError = searchParams.get('error');

  if (stripeError) {
    console.error('Stripe Standard callback error:', stripeError);
    return NextResponse.redirect(`${base}?error=connect_failed`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${base}?error=connect_failed`);
  }

  try {
    const { data: veranstalter } = await supabaseAdmin
      .from('veranstalter')
      .select('id')
      .eq('id', state)
      .single();

    if (!veranstalter) {
      return NextResponse.redirect(`${base}?error=connect_failed`);
    }

    const token = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    if (!token.stripe_user_id) {
      return NextResponse.redirect(`${base}?error=connect_failed`);
    }

    const account = await stripe.accounts.retrieve(token.stripe_user_id);

    await supabaseAdmin
      .from('veranstalter')
      .update({
        stripe_account_id: token.stripe_user_id,
        stripe_charges_enabled: account.charges_enabled,
        stripe_onboarded_at: account.charges_enabled ? new Date().toISOString() : null,
      })
      .eq('id', veranstalter.id);

    return NextResponse.redirect(`${base}?success=stripe_connected`);
  } catch (err) {
    console.error('Stripe Standard callback error:', err);
    return NextResponse.redirect(`${base}?error=connect_failed`);
  }
}
