import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import { isAdminRequest } from "@/lib/admin-auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY!);

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(Number.isFinite(value) ? value : 0);
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ticketId } = await req.json();
  if (!ticketId) return NextResponse.json({ error: "Keine Ticket-ID" }, { status: 400 });

  // Ticket aus Supabase holen
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("ticket_id", ticketId)
    .single();

  if (error || !ticket) {
    return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 });
  }

  if (ticket.status === "cancelled") {
    return NextResponse.json({ error: "Ticket bereits storniert" }, { status: 400 });
  }

  // Stripe Payment Intent finden und refunden
  try {
    const sessions = await stripe.checkout.sessions.list({ limit: 100 });
    const session = sessions.data.find(s => s.metadata?.ticketId === ticketId);

    if (session?.payment_intent) {
      await stripe.refunds.create({
        payment_intent: session.payment_intent as string,
      });
    }
  } catch (e) {
    console.error("Stripe Refund Fehler:", e);
  }

  // Status in Supabase updaten
  await supabase.from("tickets").update({ status: "cancelled" }).eq("ticket_id", ticketId);

  // Storno-E-Mail senden
  const customerName = escapeHtml(ticket.customer_name || "");
  const eventTitle = escapeHtml(ticket.event_title || "");
  const ticketAmount = formatEuro(Number(ticket.amount || 0));

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "WOLNAA Tickets <kontakt@wolnaa.de>",
    to: ticket.customer_email,
    subject: `Stornierung - ${ticket.event_title}`,
    html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:28px 18px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;">
          <tr>
            <td style="padding:0 0 26px;text-align:center;">
              <img src="https://wolnaa.de/wolnaa-logo.png" alt="WOLNAA" width="170" style="display:block;margin:0 auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="font-size:16px;line-height:1.7;color:#111827;">
              <p style="margin:0 0 16px;">Hallo <strong>${customerName}</strong>,</p>
              <p style="margin:0 0 16px;">deine Bestellung wurde erfolgreich storniert.</p>
              <p style="margin:0 0 16px;">Veranstaltung: <strong>${eventTitle}</strong></p>
              <p style="margin:0 0 16px;">Betrag: <strong>${ticketAmount}</strong></p>
              <p style="margin:0 0 22px;color:#4b5563;font-size:14px;">
                Falls eine Zahlung erstattet wurde, kann es je nach Bank einige Werktage dauern, bis der Betrag auf deinem Konto sichtbar ist.
              </p>
              <p style="margin:0;color:#6b7280;font-size:12px;">Ticket-ID: ${escapeHtml(ticketId)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
              Bei Fragen erreichst du uns unter <strong>kontakt@wolnaa.de</strong>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });

  return NextResponse.json({ success: true });
}
