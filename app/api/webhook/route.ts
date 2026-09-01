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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      await fulfillCheckoutSession(session);
    } catch (error) {
      console.error("Ticket fulfillment error:", error);
      return NextResponse.json({ error: "Ticket konnte nicht erstellt werden." }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
