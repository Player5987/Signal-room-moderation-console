// Gate admin-only areas. Pages redirect to /login; admin APIs return 401.

import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, expectedToken } from "@/lib/auth";

const PROTECTED = ["/eval", "/policies", "/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/admin");
  const needsAuth = isApi || PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!needsAuth) return NextResponse.next();

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const ok = token && token === (await expectedToken());
  if (ok) return NextResponse.next();

  if (isApi) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/eval/:path*", "/policies/:path*", "/admin/:path*", "/api/admin/:path*"],
};
