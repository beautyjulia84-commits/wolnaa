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

    // ── Line Items parsen ──────────────────────────────────────────────────
    let lineItems: { name: string; qty: number; price: string }[] = [];
    try {
      lineItems = JSON.parse(session.metadata?.lineItems || "[]");
    } catch { lineItems = []; }

    // Gesamtanzahl Tickets berechnen
    const totalTickets = lineItems.reduce((sum, item) => sum + (item.qty || 1), 0) || 1;
    const ticketIds: string[] = [];
    for (let i = 0; i < totalTickets; i++) {
      ticketIds.push(i === 0 ? ticketId : "WOLNAA-" + Math.random().toString(36).substring(2, 10).toUpperCase());
    }

    // ── In Supabase speichern (ein Eintrag pro Ticket) ────────────────────
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

    // ── QR-Codes für alle Tickets generieren ──────────────────────────────
    const qrCodes: { id: string; base64: string }[] = [];
    for (const tid of ticketIds) {
      const qrDataUrl = await QRCode.toDataURL(tid, {
        width: 300, margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      qrCodes.push({ id: tid, base64: qrDataUrl.replace("data:image/png;base64,", "") });
    }
    const qrBase64 = qrCodes[0].base64;

    // ── Email senden ──────────────────────────────────────────────────────
    await resend.emails.send({
      from: `WOLNAA Tickets <${process.env.RESEND_FROM_EMAIL}>` ,
      to: customerEmail,
      subject: `Deine Tickets – ${eventTitle}`,
      html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
<tr><td align="center">
<table width="100%" style="max-width:520px;">

  <!-- Dankeschön Text -->
  <tr><td style="padding:0 0 32px;">
    <div style="background:#fff;border-radius:16px;padding:32px;text-align:center;border:1px solid #e5e5e5;">
      <div style="font-size:28px;font-weight:900;letter-spacing:4px;margin-bottom:8px;">WOLNAA</div>
      <div style="font-size:11px;color:#999;letter-spacing:3px;margin-bottom:24px;">EXCLUSIVE EVENTS</div>
      <div style="font-size:22px;font-weight:700;margin-bottom:12px;">Vielen Dank für Ihre Bestellung!</div>
      <div style="font-size:14px;color:#666;line-height:1.6;">
        Hallo <strong>${customerName}</strong>,<br>
        Ihre ${qrCodes.length} Ticket${qrCodes.length > 1 ? "s" : ""} für <strong>${eventTitle}</strong> ${qrCodes.length > 1 ? "sind" : "ist"} bereit.<br>
        Anbei ${qrCodes.length > 1 ? "finden Sie Ihre Tickets" : "finden Sie Ihr Ticket"} als Anhang.
      </div>
    </div>
  </td></tr>

  <!-- Tickets -->
  ${qrCodes.map((qr, i) => `
  <tr><td style="padding:0 0 24px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e5e5;">
      <!-- Ticket Header -->
      <div style="background:#000;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:4px;">WOLNAA</div>
          <div style="font-size:10px;color:#888;letter-spacing:2px;">EXCLUSIVE EVENTS</div>
        </div>
        <div style="font-size:12px;color:#facc15;font-weight:700;">Ticket ${i + 1}/${qrCodes.length}</div>
      </div>
      <!-- Event Info -->
      <div style="padding:20px 24px;border-bottom:1px dashed #ddd;">
        <div style="font-size:18px;font-weight:900;color:#000;margin-bottom:16px;">${eventTitle}</div>
        <table width="100%" style="font-size:13px;color:#000;">
          <tr><td style="color:#888;padding-bottom:8px;">Inhaber</td><td style="font-weight:700;text-align:right;padding-bottom:8px;">${customerName}</td></tr>
          <tr><td style="color:#888;padding-bottom:8px;">Betrag</td><td style="font-weight:700;text-align:right;padding-bottom:8px;">${i === 0 ? amount.toFixed(2) + " €" : "–"}</td></tr>
          <tr><td style="color:#888;">Ticket-ID</td><td style="font-weight:700;text-align:right;font-family:monospace;font-size:11px;">${qr.id}</td></tr>
        </table>
      </div>
      <!-- QR Code -->
      <div style="padding:24px;text-align:center;background:#fff;">
        <img src="cid:qrcode${i}" alt="QR-Code" width="220" height="220" style="display:block;margin:0 auto;" />
        <div style="margin-top:8px;font-size:10px;color:#999;">Beim Einlass vorzeigen</div>
      </div>
      <!-- Ticket Footer -->
      <div style="background:#f9f9f9;padding:12px 24px;border-top:1px dashed #ddd;text-align:center;">
        <div style="font-size:10px;color:#bbb;">Nur einmal gültig · Kein Widerruf gemäß § 312g Abs. 2 Nr. 9 BGB</div>
      </div>
    </div>
  </td></tr>
  `).join("")}

</table>
</td></tr>
</table>
</body>
</html>`,
      attachments: qrCodes.map((qr, i) => ({
        filename: `ticket-${qr.id}.png`,
        content: qr.base64,
        contentType: "image/png",
        cid: `qrcode${i}`,
      })),
    });
  }

  return NextResponse.json({ received: true });
}
