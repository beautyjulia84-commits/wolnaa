import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { veranstalterId } = await req.json();

    if (!veranstalterId) {
      return NextResponse.json({ error: 'Veranstalter-ID fehlt.' }, { status: 400 });
    }

    const { data: veranstalter, error } = await supabaseAdmin
      .from('veranstalter')
      .select('id, firmenname, kontakt_email, website, stripe_account_id')
      .eq('id', veranstalterId)
      .single();

    if (error || !veranstalter) {
      return NextResponse.json({ error: 'Veranstalter nicht gefunden.' }, { status: 404 });
    }

    let accountId = veranstalter.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        country: 'DE',
        email: veranstalter.kontakt_email || undefined,
        business_type: 'company',
        business_profile: {
          name: veranstalter.firmenname,
          url: veranstalter.website || undefined,
        },
        controller: {
          fees: {
            payer: 'account',
          },
          losses: {
            payments: 'stripe',
          },
          requirement_collection: 'stripe',
          stripe_dashboard: {
            type: 'express',
          },
        },
      });

      accountId = account.id;

      await supabaseAdmin
        .from('veranstalter')
        .update({
          stripe_account_id: accountId,
          stripe_charges_enabled: account.charges_enabled,
        })
        .eq('id', veranstalter.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${appUrl}/veranstalter/einstellungen`,
      return_url: `${appUrl}/api/stripe/connect/callback?account_id=${accountId}`,
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: any) {
    console.error('Stripe Express connect error:', err);
    return NextResponse.json(
      { error: err?.message || 'Stripe-Verbindung fehlgeschlagen.' },
      { status: 500 }
    );
  }
}
