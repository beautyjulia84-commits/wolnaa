import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { veranstalterName } = await req.json();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.STRIPE_CONNECT_CLIENT_ID!,
    scope: 'read_write',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/connect/callback`,
    state: encodeURIComponent(veranstalterName),
    'stripe_user[country]': 'DE',
    'stripe_user[currency]': 'eur',
  });
  return NextResponse.json({ url: `https://connect.stripe.com/express/oauth/authorize?${params}` });
}
