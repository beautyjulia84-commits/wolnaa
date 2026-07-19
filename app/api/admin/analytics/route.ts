import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRequest } from "@/lib/admin-auth";

const EMPTY = { days: {}, paths: {}, referrers: {}, devices: {} };

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await supabase.from("settings").select("value").eq("key", "analytics_summary").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.value) return NextResponse.json(EMPTY);
  try { return NextResponse.json(JSON.parse(data.value)); }
  catch { return NextResponse.json(EMPTY); }
}
