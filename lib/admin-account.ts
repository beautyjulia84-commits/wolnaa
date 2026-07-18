import { createClient } from "@supabase/supabase-js";

export const defaultAdminEmail = () => (process.env.ADMIN_EMAIL || "kontakt@wolnaa.de").trim().toLowerCase();

export function adminAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function findAdminUser() {
  const client = adminAuthClient();
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;

  return data.users.find(user => user.app_metadata?.role === "admin")
    || data.users.find(user => user.email?.toLowerCase() === defaultAdminEmail())
    || null;
}

export async function currentAdminEmail() {
  const user = await findAdminUser();
  return user?.email?.toLowerCase() || defaultAdminEmail();
}
