import { NextResponse } from 'next/server';
import { getAuthedVeranstalterId } from '@/lib/veranstalter-auth';

const DEFAULT_STRIPE_CONNECT_CLIENT_ID = 'ca_UnnlDkM4Md42p77mdCrB1LSvBY7gWvRh';
const STRIPE_CONNECT_VERSION = 'stripe-oauth-v4';

export async function POST(req: Request) {
  try {
    const authedId = getAuthedVeranstalterId(req);
    const body = await req.json().catch(() => ({}));
    const veranstalterId = body?.veranstalterId;

    if (!authedId) {
      return NextResponse.json({ error: 'Nicht angemeldet.', version: STRIPE_CONNECT_VERSION }, { status: 401 });
    }
    if (veranstalterId && veranstalterId !== authedId) {
      return NextResponse.json({ error: 'Kein Zugriff.', version: STRIPE_CONNECT_VERSION }, { status: 403 });
    }

    const connectClientId =
      process.env.STRIPE_CONNECT_CLIENT_ID ||
      process.env.NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID ||
      DEFAULT_STRIPE_CONNECT_CLIENT_ID;

    if (!connectClientId) {
      return NextResponse.json(
        { error: 'Stripe Connect Client-ID fehlt.', version: STRIPE_CONNECT_VERSION },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const redirectUri = `${appUrl}/api/stripe/connect/callback`;
    const authUrl = new URL('https://connect.stripe.com/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', connectClientId);
    authUrl.searchParams.set('scope', 'read_write');
    authUrl.searchParams.set('state', authedId);
    authUrl.searchParams.set('redirect_uri', redirectUri);

    return NextResponse.json({ url: authUrl.toString(), version: STRIPE_CONNECT_VERSION });
  } catch (err: any) {
    console.error('Stripe Standard connect error:', err);
    return NextResponse.json(
      { error: err?.message || 'Stripe-Verbindung fehlgeschlagen.', version: STRIPE_CONNECT_VERSION },
      { status: 500 }
    );
  }
}
