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

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id } = await ctx.params;

  await supabase
    .from("tickets")
    .update({ event_id: null })
    .eq("event_id", id);

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
