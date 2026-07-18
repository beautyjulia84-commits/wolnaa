import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getTicketPhase, normalizeTicketName } from "@/lib/ticket-phases";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function normalizeName(value: string) {
  return (value || "").trim().toLowerCase();
}

function toMoney(value: unknown) {
  const normalized = String(value ?? "0").replace(",", ".").replace(/[^\d.-]/g, "");
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function toDiscountPercent(value: unknown) {
  const normalized = String(value ?? "").replace(",", ".").replace(/[^\d.-]/g, "");
  const percent = Number.parseFloat(normalized);
  if (!Number.isFinite(percent)) return 0;
  return Math.min(Math.max(percent, 0), 100);
}

export async function POST(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const body = await req.json();
    const { eventTitle, customerName, customerEmail, lineItems = [], ticketId, discountCode, eventId } = body;

    if (!eventId) {
      return NextResponse.json({ error: "Event-ID fehlt. Bitte Seite neu laden." }, { status: 400 });
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id,title,tickets,lounge_list,discount_codes,online_sale_ends_at,stripe_account_id,veranstalter_id,veranstalter:veranstalter_id(platform_fee_percent)")
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
    const configuredLounges = Array.isArray(event.lounge_list) ? event.lounge_list : [];
    const configuredDiscounts = Array.isArray(event.discount_codes) ? event.discount_codes : [];

    const { data: soldRows, error: soldError } = await supabase
      .from("tickets")
      .select("ticket_name,status")
      .eq("event_id", eventId);

    if (soldError) {
      return NextResponse.json({ error: "Ticketbestand konnte nicht geprüft werden." }, { status: 500 });
    }

    const phase = getTicketPhase(configuredTickets, soldRows || []);
    const configuredTicketRequests = requestedTickets.filter((item: any) =>
      configuredTickets.some((ticket: any) => normalizeTicketName(ticket.name) === normalizeTicketName(item.name))
    );
    const requestedTicketQty = configuredTicketRequests.reduce((sum: number, item: any) => sum + item.qty, 0);
    if (requestedTicketQty > 0 && !phase.activeTicket) {
      return NextResponse.json({ error: "Dieses Event ist ausverkauft." }, { status: 400 });
    }
    for (const item of configuredTicketRequests) {
      if (normalizeTicketName(item.name) !== normalizeTicketName(phase.activeTicket?.name)) {
        return NextResponse.json({ error: "Die Ticketphase hat sich geändert. Bitte lade die Seite neu." }, { status: 409 });
      }
    }
    if (phase.remaining !== null && requestedTicketQty > phase.remaining) {
      return NextResponse.json({ error: "In dieser Ticketphase sind nicht mehr genügend Tickets verfügbar." }, { status: 409 });
    }

    let subtotal = 0;
    const checkoutLineItems = (lineItems || [])
      .map((item: any) => {
        const name = String(item.name || "");
        const qty = Math.max(0, Number(item.qty || 0));
        const ticket = configuredTickets.find((entry: any) => normalizeName(entry.name) === normalizeName(name));
        const lounge = configuredLounges.find((entry: any) => normalizeName(entry.name) === normalizeName(name));
        const configured = ticket || lounge;
        const price = toMoney(configured?.price ?? item.price);

        if (!configured || qty <= 0) return null;
        subtotal += price * qty;
        return { name, price: String(price.toFixed(2)), qty };
      })
      .filter(Boolean);

    if (checkoutLineItems.length === 0 || subtotal <= 0) {
      return NextResponse.json({ error: "Bitte wähle mindestens ein gültiges Ticket aus." }, { status: 400 });
    }

    let discountPercent = 0;
    let appliedDiscountCode = "";
    if (discountCode) {
      const foundDiscount = configuredDiscounts.find((entry: any) => normalizeName(entry.code) === normalizeName(discountCode));
      if (!foundDiscount) {
        return NextResponse.json({ error: "Rabattcode ist ungültig." }, { status: 400 });
      }
      discountPercent = toDiscountPercent(foundDiscount.percent);
      if (discountPercent <= 0) {
        return NextResponse.json({ error: "Rabattcode ist nicht korrekt konfiguriert." }, { status: 400 });
      }
      appliedDiscountCode = String(foundDiscount.code || "");
    }

    const totalAmount = Math.round(subtotal * (1 - discountPercent / 100) * 100);

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json({ error: "Der Gesamtbetrag ist ungültig. Bitte lade die Seite neu." }, { status: 400 });
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
        lineItems: JSON.stringify(checkoutLineItems || []),
        discountCode: appliedDiscountCode,
        discountPercent: discountPercent ? String(discountPercent) : "",
      },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "eur",
          product_data: { name: checkoutLineItems.map((i: any) => i.name).join(", ") || "Ticket" },
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
