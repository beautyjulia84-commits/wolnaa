import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function normalizeName(value: string) {
  return (value || "").trim().toLowerCase();
}

export async function POST(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const body = await req.json();
    const { eventTitle, customerName, customerEmail, lineItems = [], ticketId, total, eventId } = body;
    const totalAmount = Math.round(Number(total) * 100);

    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      return NextResponse.json({ error: "Der Gesamtbetrag ist ungültig. Bitte lade die Seite neu." }, { status: 400 });
    }

    if (!eventId) {
      return NextResponse.json({ error: "Event-ID fehlt. Bitte Seite neu laden." }, { status: 400 });
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id,title,tickets,online_sale_ends_at,stripe_account_id,veranstalter_id,veranstalter:veranstalter_id(platform_fee_percent)")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event nicht gefunden." }, { status: 404 });
    }

    if (event.online_sale_ends_at && new Date(event.online_sale_ends_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "Der Online-Verkauf für dieses Event ist beendet." }, { status: 400 });
    }

    const requestedTickets = (lineItems || [])
      .map((item: any) => ({
        name: String(item.name || ""),
        qty: Number(item.qty || 0),
      }))
      .filter((item: any) => item.qty > 0);

    const configuredTickets = Array.isArray(event.tickets) ? event.tickets : [];
    const limitedRequests = requestedTickets.filter((item: any) => {
      const configured = configuredTickets.find((ticket: any) => normalizeName(ticket.name) === normalizeName(item.name));
      return configured?.quantity !== undefined && configured?.quantity !== null && String(configured.quantity).trim() !== "";
    });

    if (limitedRequests.length > 0) {
      const { data: soldRows, error: soldError } = await supabase
        .from("tickets")
        .select("ticket_name,status")
        .eq("event_id", eventId);

      if (soldError) {
        return NextResponse.json({ error: "Ticketbestand konnte nicht geprüft werden." }, { status: 500 });
      }

      const soldByName = new Map<string, number>();
      for (const row of soldRows || []) {
        if (row.status === "cancelled") continue;
        const key = normalizeName(row.ticket_name || "");
        soldByName.set(key, (soldByName.get(key) || 0) + 1);
      }

      for (const item of limitedRequests) {
        const configured = configuredTickets.find((ticket: any) => normalizeName(ticket.name) === normalizeName(item.name));
        const limit = Number(configured?.quantity || 0);
        const sold = soldByName.get(normalizeName(item.name)) || 0;

        if (limit > 0 && sold + item.qty > limit) {
          return NextResponse.json({ error: `${item.name} ist ausverkauft oder nicht mehr in ausreichender Menge verfügbar.` }, { status: 400 });
        }
      }
    }

    let stripeAccountId: string | null = event.stripe_account_id || null;
    let platformFeeAmount = 0;

    if (stripeAccountId) {
      const feePercent = (event.veranstalter as any)?.platform_fee_percent || parseFloat(process.env.WOLNAA_PLATFORM_FEE_PERCENT || "3");
      platformFeeAmount = Math.round(totalAmount * (feePercent / 100));
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wolnaa.de";

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      customer_email: customerEmail,
      metadata: {
        eventId: eventId || "",
        eventTitle: eventTitle || event.title || "",
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
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: appUrl,
    };

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
