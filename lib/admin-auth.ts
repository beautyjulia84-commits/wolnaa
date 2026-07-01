import type { NextRequest } from "next/server";

export function isAdminRequest(req: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const cookieToken = req.cookies.get("wolnaa-admin-token")?.value;
  const headerToken = req.headers.get("x-admin-token");

  return Boolean(adminPassword && (cookieToken === adminPassword || headerToken === adminPassword));
}
