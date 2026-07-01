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

  const { data, error } = await supabase.from("settings").select("key,value");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data ?? [] });
}

export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { settings } = await req.json();
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return NextResponse.json({ error: "Ungültige Daten." }, { status: 400 });
  }

  const upserts = Object.entries(settings).map(([key, value]) => ({
    key,
    value: String(value ?? ""),
  }));

  const { error } = await supabase
    .from("settings")
    .upsert(upserts, { onConflict: "key" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
