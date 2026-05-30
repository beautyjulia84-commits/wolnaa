import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventTitle, customerName, customerEmail, lineItems, ticketId, total } = body;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customerEmail,
      metadata: {
        eventTitle: eventTitle || "",
        customerName: customerName || "",
        customerEmail: customerEmail || "",
        ticketId: ticketId || "",
      },
      line_items: lineItems.map((item: any) => ({
        quantity: item.qty || item.quantity || 1,
        price_data: {
          currency: "eur",
          product_data: {
            name: item.name || "Ticket",
          },
          unit_amount: Math.round(Number(item.price) * 100),
        },
      })),
      success_url: "https://wolnaa.de/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://wolnaa.de",
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Stripe Fehler" },
      { status: 500 }
    );
  }
}
