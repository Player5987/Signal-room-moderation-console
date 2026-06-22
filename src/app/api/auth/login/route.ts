// POST /api/auth/login  { password }
// Verifies the password and sets an httpOnly session cookie on success.

import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminPassword, sessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.password || body.password !== adminPassword()) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await sessionToken(body.password);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}
