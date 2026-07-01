import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin-Schutz (bestehend)
  if (pathname.startsWith("/admin") || pathname.startsWith("/wolnaa-admin")) {
    if (!isAdminRequest(req)) {
      return NextResponse.redirect(new URL("/admin-login", req.url));
    }
  }

  // Veranstalter-Portal
  if (pathname === "/veranstalter/login") {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/wolnaa-admin/:path*", "/veranstalter/:path*"],
};
