// Auth middleware. Uses the edge-safe config (JWT only, no Prisma) to gate routes
// via the `authorized` callback in auth.config.ts.

import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  // Run on everything except auth endpoints, Next internals, and static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
