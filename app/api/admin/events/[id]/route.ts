import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRequest } from "@/lib/admin-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id } = await ctx.params;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("id", id)
    .is("veranstalter_id", null)
    .maybeSingle();

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }
  if (!event) {
    return NextResponse.json({ error: "Event nicht gefunden oder kein Admin-Event." }, { status: 404 });
  }

  await supabase
    .from("tickets")
    .update({ event_id: null })
    .eq("event_id", id);

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id)
    .is("veranstalter_id", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
