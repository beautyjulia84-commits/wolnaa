import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthedVeranstalterId } from '@/lib/veranstalter-auth';

const DEFAULT_STRIPE_CONNECT_CLIENT_ID = 'ca_UnnlDkM4Md42p77mdCrB1LSvBY7gWvRh';

export async function POST(req: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const authedId = getAuthedVeranstalterId(req);
    const body = await req.json().catch(() => ({}));
    const veranstalterId = body?.veranstalterId;

    if (!authedId) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }
    if (veranstalterId && veranstalterId !== authedId) {
      return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 });
    }

    const connectClientId =
      process.env.STRIPE_CONNECT_CLIENT_ID ||
      process.env.NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID ||
      DEFAULT_STRIPE_CONNECT_CLIENT_ID;

    if (!connectClientId) {
      return NextResponse.json(
        { error: 'Stripe Connect Client-ID fehlt.' },
        { status: 500 }
      );
    }

    const { data: veranstalter, error } = await supabaseAdmin
      .from('veranstalter')
      .select('id, status')
      .eq('id', authedId)
      .single();

    if (error || !veranstalter) {
      return NextResponse.json({ error: 'Veranstalter nicht gefunden.' }, { status: 404 });
    }
    if (veranstalter.status && veranstalter.status !== 'aktiv') {
      return NextResponse.json({ error: 'Veranstalter ist nicht aktiv.' }, { status: 403 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const redirectUri = `${appUrl}/api/stripe/connect/callback`;
    const authUrl = new URL('https://connect.stripe.com/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', connectClientId);
    authUrl.searchParams.set('scope', 'read_write');
    authUrl.searchParams.set('state', authedId);
    authUrl.searchParams.set('redirect_uri', redirectUri);

    return NextResponse.json({ url: authUrl.toString() });
  } catch (err: any) {
    console.error('Stripe Standard connect error:', err);
    return NextResponse.json(
      { error: err?.message || 'Stripe-Verbindung fehlgeschlagen.' },
      { status: 500 }
    );
  }
}
