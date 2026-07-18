import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { adminAuthClient, currentAdminEmail, findAdminUser } from "@/lib/admin-account";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  return NextResponse.json({ email: await currentAdminEmail() });
}

export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });

  const body = await req.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Ungültige E-Mail-Adresse." }, { status: 400 });
  }
  if (password && password.length < 10) {
    return NextResponse.json({ error: "Das Passwort muss mindestens 10 Zeichen lang sein." }, { status: 400 });
  }

  const client = adminAuthClient();
  const existingUser = await findAdminUser();
  const appMetadata = {
    ...(existingUser?.app_metadata || {}),
    role: "admin",
    password_managed: password ? true : Boolean(existingUser?.app_metadata?.password_managed),
  };

  const attributes = {
    email,
    email_confirm: true,
    app_metadata: appMetadata,
    ...(password ? { password } : {}),
  };

  const result = existingUser
    ? await client.auth.admin.updateUserById(existingUser.id, attributes)
    : await client.auth.admin.createUser(attributes);

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json({ success: true, email: result.data.user.email });
}
