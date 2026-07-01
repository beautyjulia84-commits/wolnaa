import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";
import { isAdminRequest } from "@/lib/admin-auth";
import { buildTicketEmailHtml } from "@/lib/ticket-email";
import { generateTicketPdf } from "@/lib/ticket-pdf";

const resend = new Resend(process.env.RESEND_API_KEY!);


export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  try {
    const { eventTitle, customerName, customerEmail, ticketId } = await req.json();

    // In Supabase speichern
    await supabase.from("tickets").insert({
      ticket_id: ticketId,
      event_title: eventTitle,
      customer_name: customerName,
      customer_email: customerEmail,
      amount: 0,
      status: "paid",
    });

    // QR-Code generieren
    const qrDataUrl = await QRCode.toDataURL(ticketId, {
      width: 300, margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });
    const qrBase64 = qrDataUrl.replace("data:image/png;base64,", "");
    const ticketPdf = await generateTicketPdf({
      ticketId,
      eventTitle,
      customerName,
      ticketName: "Freiticket",
      amountText: "0,00 €",
      qrBase64,
    });

    // Email senden
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "WOLNAA Tickets <kontakt@wolnaa.de>",
      to: customerEmail,
      subject: `Dein Ticket - ${eventTitle}`,
      html: buildTicketEmailHtml({
        eventTitle,
        customerName,
        ticketCount: 1,
      }),
      attachments: [{
        filename: `wolnaa-ticket-${ticketId}.pdf`,
        content: ticketPdf.toString("base64"),
        contentType: "application/pdf",
      }],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Free ticket error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
