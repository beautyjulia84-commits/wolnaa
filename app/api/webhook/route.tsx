import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import QRCode from "qrcode";
import { ImageResponse } from "@vercel/og";
import { WOLNAA_LOGO_BASE64 } from "@/lib/logo-base64";
import { supabase } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY!);

async function generateTicketPNG(
  ticketId: string,
  eventTitle: string,
  customerName: string,
  amount: number,
  ticketIndex: number,
  totalTickets: number
): Promise<Buffer> {
  const qrDataUrl = await QRCode.toDataURL(ticketId, {
    width: 400,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const img = new ImageResponse(
    <div
      style={{
        width: 600,
        height: 900,
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{
        background: "#111111",
        padding: "20px 30px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid #333",
      }}>
        <img src={WOLNAA_LOGO_BASE64} style={{ height: "60px", objectFit: "contain" }} />
        <div style={{ color: "#facc15", fontSize: "14px", fontWeight: "bold" }}>
          Ticket {ticketIndex + 1}/{totalTickets}
        </div>
      </div>

      {/* Event Info */}
      <div style={{ padding: "30px", display: "flex", flexDirection: "column", gap: "0px" }}>
        <div style={{ color: "#ffffff", fontSize: "26px", fontWeight: "bold", marginBottom: "24px" }}>
          {eventTitle}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
          <span style={{ color: "#888888", fontSize: "13px" }}>Inhaber</span>
          <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: "bold" }}>{customerName}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
          <span style={{ color: "#888888", fontSize: "13px" }}>Betrag</span>
          <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: "bold" }}>
            {ticketIndex === 0 ? `${amount.toFixed(2)} €` : "–"}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
          <span style={{ color: "#888888", fontSize: "13px" }}>Ticket-ID</span>
          <span style={{ color: "#ffffff", fontSize: "12px", fontWeight: "bold", fontFamily: "monospace" }}>{ticketId}</span>
        </div>

        {/* Gestrichelte Linie */}
        <div style={{ borderTop: "1px dashed #333333", margin: "16px 0" }} />

        {/* QR Code */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <img src={qrDataUrl} style={{ width: "280px", height: "280px" }} />
          <div style={{ color: "#888888", fontSize: "12px" }}>Beim Einlass vorzeigen</div>
        </div>

        {/* Untere Linie */}
        <div style={{ borderTop: "1px dashed #333333", margin: "16px 0" }} />

        <div style={{ color: "#555555", fontSize: "11px", textAlign: "center" }}>
          Nur einmal gültig · Kein Widerruf gemäß § 312g Abs. 2 Nr. 9 BGB
        </div>
      </div>
    </div>,
    { width: 600, height: 900 }
  );

  const arrayBuffer = await img.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

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
    try {
      lineItems = JSON.parse(session.metadata?.lineItems || "[]");
    } catch { lineItems = []; }

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

    const ticketBuffers: { id: string; buffer: Buffer }[] = [];
    for (let i = 0; i < ticketIds.length; i++) {
      const buf = await generateTicketPNG(ticketIds[i], eventTitle, customerName, amount, i, ticketIds.length);
      ticketBuffers.push({ id: ticketIds[i], buffer: buf });
    }

    await resend.emails.send({
      from: "WOLNAA Tickets <kontakt@wolnaa.de>",
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
  <tr><td style="padding:0 0 32px;">
    <div style="background:#0a0a0a;border-radius:16px;padding:40px 32px;text-align:center;">
      <img src="${WOLNAA_LOGO_BASE64}" alt="WOLNAA" width="160" style="display:block;margin:0 auto 16px;" />
      <div style="font-size:11px;color:#888;letter-spacing:3px;margin-bottom:28px;">EXCLUSIVE EVENTS</div>
      <div style="font-size:24px;font-weight:700;color:#fff;margin-bottom:12px;">Vielen Dank für deine Bestellung!</div>
      <div style="font-size:14px;color:#aaa;line-height:1.7;">
        Hallo <strong style="color:#fff;">${customerName}</strong>,<br>
        dein${totalTickets > 1 ? "e " + totalTickets : ""} Ticket${totalTickets > 1 ? "s" : ""} für <strong style="color:#fff;">${eventTitle}</strong> ${totalTickets > 1 ? "sind" : "ist"} bereit.<br><br>
        Im Anhang findest du dein${totalTickets > 1 ? "e Tickets" : " Ticket"} als PNG-Datei${totalTickets > 1 ? "en" : ""}.<br>
        Zeige den QR-Code beim Einlass vor.
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
      attachments: ticketBuffers.map((t) => ({
        filename: `wolnaa-ticket-${t.id}.png`,
        content: t.buffer.toString("base64"),
        contentType: "image/png",
      })),
    });
  }

  return NextResponse.json({ received: true });
}
