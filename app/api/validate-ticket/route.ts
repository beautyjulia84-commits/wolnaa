import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { ticketId } = await req.json();
  if (!ticketId) {
    return NextResponse.json({ error: "Keine Ticket-ID." }, { status: 400 });
  }

  // Ticket suchen
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("ticket_id", ticketId)
    .single();

  if (error || !ticket) {
    return NextResponse.json({ valid: false, reason: "Ticket nicht gefunden." }, { status: 404 });
  }

  if (ticket.status === "cancelled") {
    return NextResponse.json({
      valid: false,
      reason: "Ticket wurde storniert.",
    }, { status: 400 });
  }
  if (ticket.status === "checked_in") {
    return NextResponse.json({
      valid: false,
      reason: "Ticket bereits verwendet.",
      checkedInAt: ticket.checked_in_at,
      customerName: ticket.customer_name,
      eventTitle: ticket.event_title,
    }, { status: 409 });
  }

  // Als eingecheckt markieren
  await supabase
    .from("tickets")
    .update({ status: "checked_in", checked_in_at: new Date().toISOString() })
    .eq("ticket_id", ticketId);

  return NextResponse.json({
    valid: true,
    customerName: ticket.customer_name,
    eventTitle: ticket.event_title,
    amount: ticket.amount,
  });
}
