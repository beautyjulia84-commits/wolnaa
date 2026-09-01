import type Stripe from "stripe";
import { Resend } from "resend";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import { buildTicketEmailHtml, formatEuro } from "@/lib/ticket-email";
import { generateTicketPdf } from "@/lib/ticket-pdf";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") {
    throw new Error("Die Zahlung ist noch nicht abgeschlossen.");
  }

  const { eventId, eventTitle, customerName, ticketId } = session.metadata ?? {};
  const customerEmail = session.customer_details?.email ?? session.customer_email ?? session.metadata?.customerEmail ?? "";
  const amount = (session.amount_total ?? 0) / 100;

  if (!ticketId || !eventTitle || !customerName || !customerEmail) {
    throw new Error("Fehlende Ticketdaten in der Stripe-Sitzung.");
  }

  const { data: existingTicket, error: existingError } = await supabase
    .from("tickets")
    .select("id")
    .eq("ticket_id", ticketId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existingTicket) return { alreadyFulfilled: true };

  let lineItems: { name: string; qty: number; price: string }[] = [];
  try { lineItems = JSON.parse(session.metadata?.lineItems || "[]"); } catch { lineItems = []; }

  const totalTickets = lineItems.reduce((sum, item) => sum + (item.qty || 1), 0) || 1;
  const ticketIds = Array.from({ length: totalTickets }, (_, index) =>
    index === 0 ? ticketId : `WOLNAA-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`
  );
  const expandedItems = lineItems.flatMap(item =>
    Array.from({ length: item.qty || 1 }, () => item)
  );

  const ticketRows = ticketIds.map((id, index) => ({
    ticket_id: id,
    event_id: eventId || null,
    ticket_name: expandedItems[index]?.name || "Standard Ticket",
    quantity: 1,
    event_title: eventTitle,
    customer_name: customerName,
    customer_email: customerEmail,
    amount: index === 0 ? amount : 0,
    status: "paid",
  }));

  const { error: insertError } = await supabase.from("tickets").insert(ticketRows);
  if (insertError) throw new Error(insertError.message);

  const attachments = [];
  for (const [index, id] of ticketIds.entries()) {
    const qrDataUrl = await QRCode.toDataURL(id, {
      width: 400,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });
    const price = expandedItems[index]?.price;
    const ticketPdf = await generateTicketPdf({
      ticketId: id,
      eventTitle,
      customerName,
      ticketName: expandedItems[index]?.name || "Standard Ticket",
      amountText: price ? `${price} €` : (index === 0 ? formatEuro(amount) : ""),
      qrBase64: qrDataUrl.replace("data:image/png;base64,", ""),
    });
    attachments.push({
      filename: `wolnaa-ticket-${index + 1}-${id}.pdf`,
      content: ticketPdf.toString("base64"),
      contentType: "application/pdf",
    });
  }

  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "WOLNAA Tickets <kontakt@wolnaa.de>",
    to: customerEmail,
    subject: `Deine Tickets - ${eventTitle}`,
    html: buildTicketEmailHtml({ eventTitle, customerName, ticketCount: attachments.length }),
    attachments,
  });

  if (emailError) throw new Error("Ticket-E-Mail konnte nicht gesendet werden.");
  return { alreadyFulfilled: false };
}
