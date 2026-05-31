import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  const adminToken = req.headers.get("x-admin-token");
  if (adminToken !== process.env.ADMIN_PASSWORD) {
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
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: ticket.customer_email,
    subject: `Stornierung – ${ticket.event_title}`,
    html: `
<!DOCTYPE html>
<html lang="de">
<body style="margin:0;padding:0;background:#000;font-family:system-ui,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#111;border-radius:24px;overflow:hidden;border:1px solid #222;">
        <tr><td style="background:linear-gradient(135deg,#2b1b00,#111);padding:40px 40px 32px;text-align:center;">
          <h1 style="margin:0;font-size:36px;font-weight:900;color:#facc15;letter-spacing:4px;">WOLNAA</h1>
          <p style="margin:8px 0 0;color:#a1a1aa;font-size:14px;letter-spacing:2px;">EXCLUSIVE EVENTS</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h2 style="margin:0 0 16px;font-size:22px;font-weight:900;">Deine Bestellung wurde storniert</h2>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.7;">Hallo ${ticket.customer_name},<br><br>
          deine Bestellung für <strong style="color:#fff;">${ticket.event_title}</strong> wurde erfolgreich storniert.<br><br>
          Der Betrag von <strong style="color:#facc15;">${ticket.amount.toFixed(2)} €</strong> wird in den nächsten 5-10 Werktagen auf dein Konto zurückgebucht.</p>
          <p style="color:#52525b;font-size:12px;margin-top:24px;">Ticket-ID: ${ticketId}</p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #222;text-align:center;">
          <p style="margin:0;color:#3f3f46;font-size:12px;">© 2026 WOLNAA · Exclusive Events</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  return NextResponse.json({ success: true });
}
