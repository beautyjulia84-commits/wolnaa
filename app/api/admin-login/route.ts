import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { currentAdminEmail, findAdminUser } from "@/lib/admin-account";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return NextResponse.json({ error: "E-Mail und Passwort fehlen." }, { status: 400 });
  }

  const expectedEmail = await currentAdminEmail();
  const storedAdmin = await findAdminUser();
  const legacyPasswordAllowed = !storedAdmin?.app_metadata?.password_managed;
  let valid = normalizedEmail === expectedEmail && legacyPasswordAllowed && password === process.env.ADMIN_PASSWORD;

  if (!valid && normalizedEmail === expectedEmail) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    valid = !error
      && data.user?.email?.toLowerCase() === expectedEmail
      && (data.user.app_metadata?.role === "admin" || data.user.id === storedAdmin?.id);
  }

  if (valid && process.env.ADMIN_PASSWORD) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("wolnaa-admin-token", process.env.ADMIN_PASSWORD, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 Tage
      path: "/",
    });
    return res;
  }
  return NextResponse.json({ error: "E-Mail oder Passwort ist falsch." }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("wolnaa-admin-token");
  return res;
}
