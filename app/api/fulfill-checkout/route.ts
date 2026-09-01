import { NextResponse } from "next/server";
import Stripe from "stripe";
import { fulfillCheckoutSession } from "@/lib/fulfill-checkout";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
      return NextResponse.json({ error: "Ungültige Stripe-Sitzung." }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    await fulfillCheckoutSession(session);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Checkout fulfillment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ticket konnte nicht erstellt werden." },
      { status: 500 }
    );
  }
}
