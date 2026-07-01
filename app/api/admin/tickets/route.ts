import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isAdmin(req: NextRequest) {
  const cookieToken = req.cookies.get("wolnaa-admin-token")?.value;
  const headerToken = req.headers.get("x-admin-token");
  return cookieToken === process.env.ADMIN_PASSWORD || headerToken === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
