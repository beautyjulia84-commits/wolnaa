import { sendMetaPurchase } from '@/lib/send-meta-purchase';
import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { fulfillCheckoutSession } from "@/lib/fulfill-checkout";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Webhook-Signatur ungültig." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") return NextResponse.json({ received: true });
    try {
      await fulfillCheckoutSession(session);
      await sendMetaPurchase(session, event.created);
    } catch (error) {
      console.error("Payment processing error:", error);
      return NextResponse.json({ error: "Zahlungsnachverarbeitung wird erneut versucht." }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
