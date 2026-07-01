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

function safeExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  const fromType = file.type.split("/").pop()?.toLowerCase();
  const ext = fromName || fromType || "jpg";
  return ext.replace(/[^a-z0-9]/g, "").slice(0, 8) || "jpg";
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Bilddatei gefunden." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Nur Bilder sind erlaubt." }, { status: 400 });
  }

  const ext = safeExtension(file);
  const fileName = `admin/events/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from("images")
    .upload(fileName, bytes, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from("images").getPublicUrl(fileName);

  return NextResponse.json({ url: data.publicUrl });
}
