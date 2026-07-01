import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";
import { buildTicketEmailHtml } from "@/lib/ticket-email";

const resend = new Resend(process.env.RESEND_API_KEY!);


function isAdmin(req: NextRequest) {
  const cookieToken = req.cookies.get("wolnaa-admin-token")?.value;
  const headerToken = req.headers.get("x-admin-token");
  return cookieToken === process.env.ADMIN_PASSWORD || headerToken === process.env.ADMIN_PASSWORD;
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
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

    // Email senden
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "WOLNAA Tickets <kontakt@wolnaa.de>",
      to: customerEmail,
      subject: `Dein Ticket – ${eventTitle}`,
      html: buildTicketEmailHtml({
        eventTitle,
        customerName,
        tickets: [{
          ticketId,
          ticketName: "Freiticket",
          amountText: "0,00 €",
          qrContentId: "ticket-qr-0",
        }],
      }),
      attachments: [{
        filename: `ticket-${ticketId}.png`,
        content: qrBase64,
        contentType: "image/png",
        contentId: "ticket-qr-0",
      }],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Free ticket error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
