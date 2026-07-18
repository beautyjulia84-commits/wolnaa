import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminAuthClient, currentAdminEmail, findAdminUser } from "@/lib/admin-account";

export async function POST(req: Request) {
  const { email } = await req.json();
  const normalizedEmail = String(email || "").trim().toLowerCase();

  // Immer dieselbe Antwort, damit die Admin-Adresse nicht bestätigt oder verraten wird.
  const expectedEmail = await currentAdminEmail();
  if (!normalizedEmail || normalizedEmail !== expectedEmail) {
    return NextResponse.json({ success: true });
  }

  const redirectTo = new URL("/admin-passwort-festlegen", req.url).toString();
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const adminClient = adminAuthClient();
  const existingUser = await findAdminUser();

  if (existingUser) {
    await adminClient.auth.admin.updateUserById(existingUser.id, {
      app_metadata: { ...existingUser.app_metadata, role: "admin", password_managed: true },
    });
    await authClient.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
  } else {
    const { data } = await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, { redirectTo });
    if (data.user) {
      await adminClient.auth.admin.updateUserById(data.user.id, {
        app_metadata: { role: "admin", password_managed: true },
      });
    }
  }

  return NextResponse.json({ success: true });
}
