import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const adminEmail = () => (process.env.ADMIN_EMAIL || "kontakt@wolnaa.de").trim().toLowerCase();

export async function POST(req: Request) {
  const { email } = await req.json();
  const normalizedEmail = String(email || "").trim().toLowerCase();

  // Immer dieselbe Antwort, damit die Admin-Adresse nicht bestätigt oder verraten wird.
  if (!normalizedEmail || normalizedEmail !== adminEmail()) {
    return NextResponse.json({ success: true });
  }

  const redirectTo = new URL("/admin-passwort-festlegen", req.url).toString();
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const exists = data.users.some(user => user.email?.toLowerCase() === normalizedEmail);

  if (exists) {
    await authClient.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
  } else {
    await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, { redirectTo });
  }

  return NextResponse.json({ success: true });
}
