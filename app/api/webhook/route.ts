import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import { buildTicketEmailHtml, formatEuro } from "@/lib/ticket-email";
import { generateTicketPdf } from "@/lib/ticket-pdf";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY!);

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
    const { eventId, eventTitle, customerName, ticketId } = session.metadata ?? {};
    const customerEmail = session.customer_details?.email ?? session.customer_email ?? session.metadata?.customerEmail ?? "";
    const amount = (session.amount_total ?? 0) / 100;

    if (!ticketId || !eventTitle || !customerName || !customerEmail) {
      return NextResponse.json({ error: "Fehlende Metadaten." }, { status: 400 });
    }

    let lineItems: { name: string; qty: number; price: string }[] = [];
    try { lineItems = JSON.parse(session.metadata?.lineItems || "[]"); } catch { lineItems = []; }

    const totalTickets = lineItems.reduce((sum, item) => sum + (item.qty || 1), 0) || 1;
    const ticketIds: string[] = [];
    for (let i = 0; i < totalTickets; i++) {
      ticketIds.push(i === 0 ? ticketId : "WOLNAA-" + Math.random().toString(36).substring(2, 10).toUpperCase());
    }

    const expandedItems = lineItems.flatMap((item) =>
      Array.from({ length: item.qty || 1 }, () => item)
    );

    const ticketRows = ticketIds.map((tid, i) => ({
      ticket_id: tid,
      event_id: eventId || null,
      ticket_name: expandedItems[i]?.name || "",
      quantity: 1,
      event_title: eventTitle,
      customer_name: customerName,
      customer_email: customerEmail,
      amount: i === 0 ? amount : 0,
      status: "paid",
    }));

    const { error: dbError } = await supabase.from("tickets").insert(ticketRows);
    if (dbError) {
      console.error("Supabase Fehler:", JSON.stringify(dbError));
      return NextResponse.json({ error: "Datenbankfehler.", details: dbError.message, code: dbError.code }, { status: 500 });
    }

    if (eventId) {
      const { data: currentEvent } = await supabase
        .from("events")
        .select("tickets_sold,total_revenue")
        .eq("id", eventId)
        .single();

      await supabase
        .from("events")
        .update({
          tickets_sold: Number(currentEvent?.tickets_sold || 0) + totalTickets,
          total_revenue: Number(currentEvent?.total_revenue || 0) + Math.round(amount * 100),
        })
        .eq("id", eventId);
    }

    const ticketAttachments = [];
    for (const [index, tid] of ticketIds.entries()) {
      const qrDataUrl = await QRCode.toDataURL(tid, { width: 400, margin: 2, color: { dark: "#000000", light: "#ffffff" } });
      const qrBase64 = qrDataUrl.replace("data:image/png;base64,", "");
      const amountText = expandedItems[index]?.price ? `${expandedItems[index].price} €` : (index === 0 ? formatEuro(amount) : "");
      const ticketPdf = await generateTicketPdf({
        ticketId: tid,
        eventTitle,
        customerName,
        ticketName: expandedItems[index]?.name || "Standard Ticket",
        amountText,
        qrBase64,
      });
      ticketAttachments.push({
        filename: `wolnaa-ticket-${index + 1}-${tid}.pdf`,
        content: ticketPdf.toString("base64"),
        contentType: "application/pdf",
      });
    }

    await resend.emails.send({
      from: "WOLNAA Tickets <kontakt@wolnaa.de>",
      to: customerEmail,
      subject: `Deine Tickets - ${eventTitle}`,
      html: buildTicketEmailHtml({
        eventTitle,
        customerName,
        ticketCount: ticketAttachments.length,
      }),
      attachments: ticketAttachments,
    });
  }

  return NextResponse.json({ received: true });
}
