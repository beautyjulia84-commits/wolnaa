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

    // ── In Supabase speichern ──────────────────────────────────────────────
    const { error: dbError } = await supabase.from("tickets").insert({
      ticket_id: ticketId,
      event_title: eventTitle,
      customer_name: customerName,
      customer_email: customerEmail,
      amount,
      status: "paid",
    });

    if (dbError) {
      console.error("Supabase Fehler:", JSON.stringify(dbError));
      return NextResponse.json({ error: "Datenbankfehler.", details: dbError.message, code: dbError.code }, { status: 500 });
    }

    // ── QR-Code generieren ────────────────────────────────────────────────
    const qrDataUrl = await QRCode.toDataURL(ticketId, {
      width: 300,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });
    const qrBase64 = qrDataUrl.replace("data:image/png;base64,", "");

    // ── Email senden ──────────────────────────────────────────────────────
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: customerEmail,
      subject: `Dein Ticket – ${eventTitle}`,
      html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000;font-family:system-ui,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#111;border-radius:24px;overflow:hidden;border:1px solid #222;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#2b1b00,#111);padding:40px 40px 32px;text-align:center;">
          <h1 style="margin:0;font-size:36px;font-weight:900;color:#facc15;letter-spacing:4px;">WOLNAA</h1>
          <p style="margin:8px 0 0;color:#a1a1aa;font-size:14px;letter-spacing:2px;">EXCLUSIVE EVENTS</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 4px;color:#facc15;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Dein Ticket</p>
          <h2 style="margin:0 0 24px;font-size:26px;font-weight:900;">${eventTitle}</h2>

          <table width="100%" style="margin-bottom:28px;">
            <tr>
              <td style="color:#71717a;font-size:13px;padding-bottom:8px;">Name</td>
              <td style="color:#fff;font-size:14px;font-weight:600;text-align:right;padding-bottom:8px;">${customerName}</td>
            </tr>
            <tr>
              <td style="color:#71717a;font-size:13px;padding-bottom:8px;">Betrag</td>
              <td style="color:#facc15;font-size:14px;font-weight:700;text-align:right;padding-bottom:8px;">${amount.toFixed(2)} €</td>
            </tr>
            <tr>
              <td style="color:#71717a;font-size:13px;">Ticket-ID</td>
              <td style="color:#a1a1aa;font-size:12px;font-family:monospace;text-align:right;">${ticketId}</td>
            </tr>
          </table>

          <!-- QR Code -->
          <div style="text-align:center;background:#fff;border-radius:16px;padding:24px;margin:0 0 24px;">
            <img src="cid:qrcode" alt="QR-Code" width="220" height="220" style="display:block;margin:0 auto;" />
            <p style="margin:12px 0 0;color:#000;font-size:11px;font-family:monospace;">${ticketId}</p>
          </div>

          <p style="margin:0;color:#52525b;font-size:12px;line-height:1.6;text-align:center;">
            Dieses Ticket ist nur einmal gültig. Bitte zeige den QR-Code beim Einlass vor.<br>
            Kein Widerruf gemäß § 312g Abs. 2 Nr. 9 BGB.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid #222;text-align:center;">
          <p style="margin:0;color:#3f3f46;font-size:12px;">© 2026 WOLNAA · Exclusive Events</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
      attachments: [
        {
          filename: `ticket-${ticketId}.png`,
          content: qrBase64,
          contentType: "image/png",
        },
      ],
    });
  }

  return NextResponse.json({ received: true });
}
