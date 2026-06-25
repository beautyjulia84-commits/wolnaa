import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
export async function GET(req: Request) {
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const base = `${process.env.NEXT_PUBLIC_APP_URL}/veranstalter/einstellungen`;

  if (!code) return NextResponse.redirect(`${base}?error=connect_failed`);

  try {
    const oauth = await stripe.oauth.token({ grant_type: 'authorization_code', code });
    const accountId = oauth.stripe_user_id!;
    const account = await stripe.accounts.retrieve(accountId);

    await supabaseAdmin.from('veranstalter').update({
      stripe_account_id: accountId,
      stripe_charges_enabled: account.charges_enabled,
      stripe_onboarded_at: new Date().toISOString(),
    }).eq('firmenname', decodeURIComponent(state || ''));

    return NextResponse.redirect(`${base}?success=stripe_connected`);
  } catch (err) {
    console.error('Stripe Connect callback error:', err);
    return NextResponse.redirect(`${base}?error=connect_failed`);
  }
}
