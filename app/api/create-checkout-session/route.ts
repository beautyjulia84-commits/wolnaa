import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventTitle, customerName, customerEmail, lineItems, ticketId, total, eventId } = body;
    const totalAmount = Math.round(Number(total) * 100);

    // Event laden um Stripe-Konto + Provision zu ermitteln
    let stripeAccountId: string | null = null;
    let platformFeeAmount = 0;

    if (eventId) {
      const { data: event } = await supabase
        .from("events")
        .select("stripe_account_id, veranstalter_id, veranstalter:veranstalter_id(platform_fee_percent)")
        .eq("id", eventId)
        .single();

      if (event?.stripe_account_id) {
        stripeAccountId = event.stripe_account_id;
        const feePercent = (event.veranstalter as any)?.platform_fee_percent || parseFloat(process.env.WOLNAA_PLATFORM_FEE_PERCENT || "3");
        platformFeeAmount = Math.round(totalAmount * (feePercent / 100));
      }
    }

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      customer_email: customerEmail,
      metadata: {
        eventTitle: eventTitle || "",
        customerName: customerName || "",
        customerEmail: customerEmail || "",
        ticketId: ticketId || "",
        lineItems: JSON.stringify(lineItems || []),
      },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "eur",
          product_data: { name: lineItems.map((i: any) => i.name).join(", ") || "Ticket" },
          unit_amount: totalAmount,
        },
      }],
      success_url: "https://wolnaa.de/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://wolnaa.de",
    };

    // Plattformgebühr nur bei externem Stripe-Konto
    if (stripeAccountId) {
      sessionConfig.payment_intent_data = {
        application_fee_amount: platformFeeAmount,
      };
    }

    const stripeOptions = stripeAccountId ? { stripeAccount: stripeAccountId } : {};
    const session = await stripe.checkout.sessions.create(sessionConfig, stripeOptions);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: error.message || "Stripe Fehler" }, { status: 500 });
  }
}
