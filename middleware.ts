import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin-Schutz (bestehend)
  if (pathname.startsWith("/admin") || pathname.startsWith("/wolnaa-admin")) {
    const token = req.cookies.get("wolnaa-admin-token")?.value;
    if (!token || token !== process.env.ADMIN_PASSWORD) {
      return NextResponse.redirect(new URL("/admin-login", req.url));
    }
  }

  // Veranstalter-Portal
  if (pathname === "/veranstalter/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/veranstalter/")) {
    const vid = req.cookies.get("veranstalter_id")?.value;
    if (!vid) {
      return NextResponse.redirect(new URL("/veranstalter/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/wolnaa-admin/:path*", "/veranstalter/:path*"],
};
