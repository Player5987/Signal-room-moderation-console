"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface NavUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
}

export default function Nav({ user }: { user?: NavUser | null }) {
  const pathname = usePathname();
  const isAdmin = user?.role === "admin";

  const PUBLIC = isAdmin
    ? [{ href: "/", label: "Submit" }, { href: "/queue", label: "All queries" }]
    : [{ href: "/", label: "Submit" }, { href: "/queue", label: "My history" }];
  const ADMIN = [
    { href: "/admin", label: "Dashboard" },
    { href: "/eval", label: "Evaluation" },
    { href: "/policies", label: "Policies" },
  ];

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
          <span style={{ position: "absolute", left: 0, right: 0, bottom: -6, height: 2, borderRadius: 2, background: "linear-gradient(90deg, var(--brand), #38e0c8)", boxShadow: "0 0 12px var(--brand-glow)" }} />
        )}
      </Link>
    );
  };

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid var(--line-soft)" }} className="glass">
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0.85rem 1.4rem", display: "flex", alignItems: "center", gap: "1.6rem" }}>
        <Link href="/" className="font-display" style={{ display: "flex", alignItems: "center", gap: ".55rem", textDecoration: "none", color: "var(--text)", fontWeight: 700 }}>
          <span style={{ width: 22, height: 22, borderRadius: 7, background: "linear-gradient(135deg, var(--brand), #38e0c8)", boxShadow: "0 0 16px var(--brand-glow)", display: "inline-block" }} />
          Signal Room
        </Link>

        {user && (
          <nav style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
            {PUBLIC.map((l) => link(l.href, l.label))}
            {isAdmin && ADMIN.map((l) => link(l.href, l.label))}
          </nav>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: ".7rem" }}>
          {user ? (
            <>
              {isAdmin && <span className="pill pill-ok">admin</span>}
              <span style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                {user.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" width={24} height={24} style={{ borderRadius: "50%" }} />
                )}
                <span style={{ fontSize: ".82rem", color: "var(--muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.name || user.email}
                </span>
              </span>
              <button className="btn" onClick={() => signOut({ callbackUrl: "/login" })} style={{ padding: ".4rem .8rem" }}>
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="btn" style={{ padding: ".4rem .8rem", textDecoration: "none" }}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
