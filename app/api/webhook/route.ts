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
    const ticketHtml = qrCodes.map((qr, i) => `
      <div style="background:#fff;border:2px solid #000;border-radius:16px;max-width:400px;margin:0 auto 32px;font-family:Arial,sans-serif;overflow:hidden;page-break-after:always;">
        <!-- Ticket Header -->
        <div style="background:#000;padding:24px;text-align:center;">
          <div style="font-size:32px;font-weight:900;color:#fff;letter-spacing:6px;margin-bottom:4px;">WOLNAA</div>
          <div style="font-size:11px;color:#999;letter-spacing:3px;">EXCLUSIVE EVENTS</div>
        </div>
        <!-- Trennlinie mit Perforierung -->
        <div style="border-top:2px dashed #ccc;margin:0;"></div>
        <!-- Event Info -->
        <div style="padding:20px 24px;border-bottom:1px solid #eee;">
          <div style="font-size:18px;font-weight:900;color:#000;margin-bottom:12px;">${eventTitle}</div>
          <table width="100%" style="font-size:12px;">
            <tr>
              <td style="color:#666;padding-bottom:6px;">Name</td>
              <td style="color:#000;font-weight:700;text-align:right;padding-bottom:6px;">${customerName}</td>
            </tr>
            <tr>
              <td style="color:#666;padding-bottom:6px;">Ticket</td>
              <td style="color:#000;font-weight:700;text-align:right;padding-bottom:6px;">${i + 1} von ${qrCodes.length}</td>
            </tr>
            <tr>
              <td style="color:#666;">Betrag</td>
              <td style="color:#000;font-weight:700;text-align:right;">${i === 0 ? amount.toFixed(2) + " €" : "–"}</td>
            </tr>
          </table>
        </div>
        <!-- QR Code -->
        <div style="padding:24px;text-align:center;background:#fff;">
          <img src="cid:qrcode${i}" alt="QR-Code" width="200" height="200" style="display:block;margin:0 auto;" />
          <div style="margin-top:12px;font-size:10px;font-family:monospace;color:#666;letter-spacing:1px;">${qr.id}</div>
        </div>
        <!-- Ticket Footer -->
        <div style="background:#f5f5f5;padding:12px 24px;border-top:2px dashed #ccc;">
          <p style="margin:0;font-size:10px;color:#999;text-align:center;">Nur einmal gültig · Beim Einlass vorzeigen · Kein Widerruf gemäß § 312g Abs. 2 Nr. 9 BGB</p>
        </div>
      </div>
    `).join("");

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: customerEmail,
      subject: `Deine Tickets – ${eventTitle}`,
      html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>@media print { .no-print { display:none; } }</style>
</head>
<body style="margin:0;padding:40px 20px;background:#f0f0f0;font-family:Arial,sans-serif;">
  <div class="no-print" style="max-width:400px;margin:0 auto 24px;text-align:center;">
    <p style="color:#666;font-size:14px;">Deine ${qrCodes.length} Ticket${qrCodes.length > 1 ? "s" : ""} für <strong>${eventTitle}</strong>.<br>Du kannst diese E-Mail ausdrucken.</p>
  </div>
  ${ticketHtml}
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
