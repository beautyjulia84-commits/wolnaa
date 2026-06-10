import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import QRCode from "qrcode";
import { createCanvas, loadImage } from "canvas";
import path from "path";
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
  const W = 600;
  const H = 900;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Hintergrund schwarz
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, H);

  // Header-Bereich
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, W, 140);

  // Logo laden
  try {
    const logoPath = path.join(process.cwd(), "public", "wolnaa-logo.png");
    const logo = await loadImage(logoPath);
    const logoW = 160;
    const logoH = (logo.height / logo.width) * logoW;
    ctx.drawImage(logo, 30, (140 - logoH) / 2, logoW, logoH);
  } catch {
    // Fallback: Text-Logo
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px Arial";
    ctx.letterSpacing = "6px";
    ctx.fillText("WOLNAA", 30, 85);
  }

  // Ticket-Nummer oben rechts
  ctx.fillStyle = "#facc15";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "right";
  ctx.fillText(`Ticket ${ticketIndex + 1}/${totalTickets}`, W - 30, 75);

  // EXCLUSIVE EVENTS
  ctx.fillStyle = "#888888";
  ctx.font = "11px Arial";
  ctx.fillText("EXCLUSIVE EVENTS", W - 30, 95);
  ctx.textAlign = "left";

  // Trennlinie
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 140);
  ctx.lineTo(W, 140);
  ctx.stroke();

  // Event-Titel
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px Arial";
  ctx.fillText(eventTitle, 30, 195);

  // Inhaber Label + Wert
  ctx.fillStyle = "#888888";
  ctx.font = "13px Arial";
  ctx.fillText("Inhaber", 30, 250);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px Arial";
  ctx.textAlign = "right";
  ctx.fillText(customerName, W - 30, 250);

  // Betrag
  ctx.fillStyle = "#888888";
  ctx.font = "13px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Betrag", 30, 290);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px Arial";
  ctx.textAlign = "right";
  ctx.fillText(ticketIndex === 0 ? `${amount.toFixed(2)} €` : "–", W - 30, 290);

  // Ticket-ID
  ctx.fillStyle = "#888888";
  ctx.font = "13px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Ticket-ID", 30, 330);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "right";
  ctx.fillText(ticketId, W - 30, 330);
  ctx.textAlign = "left";

  // Gestrichelte Trennlinie
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(30, 360);
  ctx.lineTo(W - 30, 360);
  ctx.stroke();
  ctx.setLineDash([]);

  // QR-Code generieren
  const qrDataUrl = await QRCode.toDataURL(ticketId, {
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
  const qrImage = await loadImage(qrDataUrl);
  const qrSize = 280;
  const qrX = (W - qrSize) / 2;
  ctx.drawImage(qrImage, qrX, 385, qrSize, qrSize);

  // "Beim Einlass vorzeigen"
  ctx.fillStyle = "#888888";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Beim Einlass vorzeigen", W / 2, 690);

  // Untere gestrichelte Linie
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(30, 715);
  ctx.lineTo(W - 30, 715);
  ctx.stroke();
  ctx.setLineDash([]);

  // Footer Text
  ctx.fillStyle = "#555555";
  ctx.font = "11px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Nur einmal gültig · Kein Widerruf gemäß § 312g Abs. 2 Nr. 9 BGB", W / 2, 745);

  return canvas.toBuffer("image/png");
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

    // Line Items parsen
    let lineItems: { name: string; qty: number; price: string }[] = [];
    try {
      lineItems = JSON.parse(session.metadata?.lineItems || "[]");
    } catch { lineItems = []; }

    const totalTickets = lineItems.reduce((sum, item) => sum + (item.qty || 1), 0) || 1;
    const ticketIds: string[] = [];
    for (let i = 0; i < totalTickets; i++) {
      ticketIds.push(i === 0 ? ticketId : "WOLNAA-" + Math.random().toString(36).substring(2, 10).toUpperCase());
    }

    // In Supabase speichern
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

    // Ticket-PNGs generieren
    const ticketBuffers: { id: string; buffer: Buffer }[] = [];
    for (let i = 0; i < ticketIds.length; i++) {
      const buf = await generateTicketPNG(ticketIds[i], eventTitle, customerName, amount, i, ticketIds.length);
      ticketBuffers.push({ id: ticketIds[i], buffer: buf });
    }

    // Email senden
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
      <img src="https://wolnaa.de/wolnaa-logo.png" alt="WOLNAA" width="160" style="display:block;margin:0 auto 16px;" />
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
