"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Signature 3D moment: card tilts toward the cursor.
  function onMove(e: React.MouseEvent) {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rotY = (px - 0.5) * 12;
    const rotX = (0.5 - py) * 12;
    el.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
  }
  function onLeave() {
    const el = cardRef.current;
    if (el) el.style.transform = "rotateX(0) rotateY(0)";
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sign in failed.");
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tilt-scene" style={{ display: "flex", justifyContent: "center", paddingTop: "3rem" }}>
      <div
        ref={cardRef}
        className="tilt glass reveal"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ position: "relative", width: "100%", maxWidth: 420, padding: "2rem", borderRadius: 20 }}
      >
        <div className="tilt-glow" style={{ borderRadius: 20 }} />
        <div style={{ position: "relative", transform: "translateZ(40px)" }}>
          <span className="pill pill-muted" style={{ marginBottom: "1rem" }}>
            restricted area
          </span>
          <h1 className="font-display" style={{ fontSize: "1.6rem", fontWeight: 700, margin: ".4rem 0" }}>
            Admin sign in
          </h1>
          <p style={{ color: "var(--muted)", fontSize: ".9rem", marginBottom: "1.4rem" }}>
            The dashboard, evaluation, and policy controls are staff-only.
          </p>

          <label className="mono" style={{ fontSize: ".72rem", color: "var(--muted)", textTransform: "uppercase" }}>
            Password
          </label>
          <input
            type="password"
            className="field"
            style={{ marginTop: ".4rem" }}
            value={password}
            autoFocus
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="••••••••"
          />
          {error && <p style={{ color: "var(--danger)", fontSize: ".85rem", marginTop: ".6rem" }}>{error}</p>}

          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={loading || !password}
            style={{ width: "100%", justifyContent: "center", marginTop: "1.1rem" }}
          >
            {loading ? "Verifying…" : "Enter console"}
          </button>
          <p style={{ color: "var(--faint)", fontSize: ".78rem", marginTop: "1rem" }}>
            Default password is <span className="mono">admin</span> — set <span className="mono">ADMIN_PASSWORD</span> in
            your environment to change it.
          </p>
        </div>
      </div>
    </div>
  );
}
