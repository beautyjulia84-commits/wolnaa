import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { stripeAccountId } = await req.json();
  try {
    const link = await stripe.accounts.createLoginLink(stripeAccountId);
    return NextResponse.json({ url: link.url });
  } catch (err) {
    return NextResponse.json({ error: 'Fehler' }, { status: 500 });
  }
}
