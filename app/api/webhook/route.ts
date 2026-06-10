import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";

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
    const { eventTitle, customerName, ticketId } = session.metadata ?? {};
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

    const ticketRows = ticketIds.map((tid, i) => ({
      ticket_id: tid,
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

    const qrAttachments = [];
    for (const tid of ticketIds) {
      const qrDataUrl = await QRCode.toDataURL(tid, { width: 400, margin: 2, color: { dark: "#000000", light: "#ffffff" } });
      const qrBase64 = qrDataUrl.replace("data:image/png;base64,", "");
      qrAttachments.push({ filename: `ticket-${tid}.png`, content: qrBase64, contentType: "image/png" });
    }

    await resend.emails.send({
      from: "WOLNAA Tickets <kontakt@wolnaa.de>",
      to: customerEmail,
      subject: `Deine Tickets – ${eventTitle}`,
      html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
<tr><td align="center">
<table width="100%" style="max-width:520px;">
  <tr><td>
    <div style="background:#0a0a0a;border-radius:16px;padding:40px 32px;text-align:center;">
      <img src="https://wolnaa.de/wolnaa-logo.png" alt="WOLNAA" width="160" style="display:block;margin:0 auto 16px;" />
      <div style="font-size:11px;color:#888;letter-spacing:3px;margin-bottom:28px;">EXCLUSIVE EVENTS</div>
      <div style="font-size:24px;font-weight:700;color:#fff;margin-bottom:12px;">Vielen Dank für deine Bestellung!</div>
      <div style="font-size:14px;color:#aaa;line-height:1.7;">
        Hallo <strong style="color:#fff;">${customerName}</strong>,<br>
        dein${totalTickets > 1 ? "e " + totalTickets : ""} Ticket${totalTickets > 1 ? "s" : ""} für <strong style="color:#fff;">${eventTitle}</strong> ${totalTickets > 1 ? "sind" : "ist"} bereit.<br><br>
        Im Anhang findest du den QR-Code${totalTickets > 1 ? "s" : ""}.<br>
        Zeige ihn beim Einlass vor.
      </div>
    </div>
  </td></tr>
  <tr><td style="text-align:center;padding:16px 0 0;">
    <div style="font-size:11px;color:#aaa;">Bei Fragen: kontakt@wolnaa.de</div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
      attachments: qrAttachments,
    });
  }

  return NextResponse.json({ received: true });
}
