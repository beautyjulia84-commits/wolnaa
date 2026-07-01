import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRequest } from "@/lib/admin-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  const eventTitle = searchParams.get("eventTitle");

  if (!eventId && !eventTitle) {
    return NextResponse.json({ tickets: [] });
  }

  let query = supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (eventId) {
    query = query.eq("event_id", eventId);
  } else if (eventTitle) {
    query = query.eq("event_title", eventTitle);
  }

  let { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (eventId && eventTitle && (!data || data.length === 0)) {
    const fallback = await supabase
      .from("tickets")
      .select("*")
      .eq("event_title", eventTitle)
      .order("created_at", { ascending: false });

    data = fallback.data;
    error = fallback.error;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const tickets = (data ?? []).map((ticket: any) => ({
    ...ticket,
    id: ticket.id,
    ticket_id: ticket.ticket_id || "",
    event_title: ticket.event_title || "",
    customer_name: ticket.customer_name || "",
    customer_email: ticket.customer_email || "",
    amount: Number(ticket.total_amount || ticket.price || ticket.amount || 0),
    status: ticket.status || "paid",
    created_at: ticket.created_at || "",
  }));

  return NextResponse.json({ tickets });
}
