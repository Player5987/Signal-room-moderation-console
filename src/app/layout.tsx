import type { Metadata } from "next";
import { cookies } from "next/headers";
import Nav from "@/components/Nav";
import { ADMIN_COOKIE, expectedToken } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal Room — Moderation Console",
  description: "LLM-powered content moderation with human review, evaluation, and live policies.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  const isAdmin = !!token && token === (await expectedToken());

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="ambient" />
        <div className="grid-overlay" />
        <Nav isAdmin={isAdmin} />
        <main style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem 1.4rem 4rem" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
