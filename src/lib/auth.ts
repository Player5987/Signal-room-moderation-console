// Minimal admin auth. The session cookie holds a SHA-256 token derived from
// ADMIN_PASSWORD, so it can't be forged without knowing the password. Both the
// login route (Node) and the middleware (Edge) compute the same token using the
// Web Crypto API available in both runtimes.
//
// This is intentionally lightweight for a portfolio project. For production
// you'd use a real auth library (Auth.js / Clerk) with proper sessions.

export const ADMIN_COOKIE = "mc_admin";

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "admin"; // default for local dev; override in .env
}

export async function sessionToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`signal-room::${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function expectedToken(): Promise<string> {
  return sessionToken(adminPassword());
}
