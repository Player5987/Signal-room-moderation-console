"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const PUBLIC = [
  { href: "/", label: "Submit" },
  { href: "/queue", label: "Queue" },
];
const ADMIN = [
  { href: "/admin", label: "Dashboard" },
  { href: "/eval", label: "Evaluation" },
  { href: "/policies", label: "Policies" },
];

export default function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const link = (href: string, label: string) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        style={{
          textDecoration: "none",
          fontSize: ".9rem",
          fontWeight: 600,
          color: active ? "var(--text)" : "var(--muted)",
          position: "relative",
          padding: ".25rem 0",
        }}
      >
        {label}
        {active && (
          <span
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: -6,
              height: 2,
              borderRadius: 2,
              background: "linear-gradient(90deg, var(--brand), var(--brand2, #38e0c8))",
              boxShadow: "0 0 12px var(--brand-glow)",
            }}
          />
        )}
      </Link>
    );
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid var(--line-soft)",
      }}
      className="glass"
    >
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0.85rem 1.4rem",
          display: "flex",
          alignItems: "center",
          gap: "1.6rem",
        }}
      >
        <Link
          href="/"
          className="font-display"
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".55rem",
            textDecoration: "none",
            color: "var(--text)",
            fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 7,
              background: "linear-gradient(135deg, var(--brand), var(--brand2, #38e0c8))",
              boxShadow: "0 0 16px var(--brand-glow)",
              display: "inline-block",
            }}
          />
          Signal Room
        </Link>

        <nav style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
          {PUBLIC.map((l) => link(l.href, l.label))}
          {isAdmin && ADMIN.map((l) => link(l.href, l.label))}
        </nav>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: ".6rem" }}>
          {isAdmin ? (
            <>
              <span className="pill pill-ok">admin</span>
              <button className="btn" onClick={logout} style={{ padding: ".4rem .8rem" }}>
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="btn" style={{ padding: ".4rem .8rem", textDecoration: "none" }}>
              Admin sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
