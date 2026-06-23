import type { Metadata } from "next";
import { auth } from "@/auth";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal Room — Moderation Console",
  description: "Multi-tenant, multilingual LLM content moderation with per-user history and admin review.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: (session.user as { role?: string }).role,
      }
    : null;

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
        <Nav user={user} />
        <main style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem 1.4rem 4rem" }}>{children}</main>
      </body>
    </html>
  );
}
