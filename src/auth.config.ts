// Edge-safe auth config: providers + callbacks only, NO database adapter.
// Used by middleware (which runs on the Edge runtime where Prisma can't run)
// and spread into the full config in auth.ts.

import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { NextResponse } from "next/server";

const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_ONLY = ["/admin", "/eval", "/policies"];

export const authConfig = {
  providers: [Google],
  pages: { signIn: "/login" },
  trustHost: true,
  callbacks: {
    // Decides access for every matched route. Returning false sends the user
    // to the sign-in page; returning a redirect Response sends them elsewhere.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = (auth?.user as { role?: string } | undefined)?.role;
      const p = nextUrl.pathname;

      if (p === "/login") return true;

      const adminOnly =
        ADMIN_ONLY.some((x) => p === x || p.startsWith(x + "/")) || p.startsWith("/api/admin");

      if (adminOnly) {
        if (!isLoggedIn) return false; // -> sign in
        if (role !== "admin") return NextResponse.redirect(new URL("/", nextUrl)); // logged in but not admin
        return true;
      }

      // Everything else (Submit, history, moderate/queue APIs) just needs login.
      return isLoggedIn;
    },
    async jwt({ token }) {
      if (token.email) {
        token.role = adminEmails.includes(String(token.email).toLowerCase()) ? "admin" : "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        (session.user as { role?: string }).role = (token.role as string) || "user";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
