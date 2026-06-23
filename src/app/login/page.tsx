"use client";

import { useRef, useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  // Signature 3D tilt toward the cursor.
  function onMove(e: React.MouseEvent) {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.transform = `rotateX(${(0.5 - py) * 12}deg) rotateY(${(px - 0.5) * 12}deg)`;
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
  }
  function onLeave() {
    if (cardRef.current) cardRef.current.style.transform = "rotateX(0) rotateY(0)";
  }

  return (
    <div className="tilt-scene" style={{ display: "flex", justifyContent: "center", paddingTop: "3rem" }}>
      <div
        ref={cardRef}
        className="tilt glass reveal"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ position: "relative", width: "100%", maxWidth: 440, padding: "2.2rem", borderRadius: 20 }}
      >
        <div className="tilt-glow" style={{ borderRadius: 20 }} />
        <div style={{ position: "relative", transform: "translateZ(40px)" }}>
          <span className="pill pill-muted" style={{ marginBottom: "1rem" }}>signal room</span>
          <h1 className="font-display" style={{ fontSize: "1.7rem", fontWeight: 700, margin: ".4rem 0" }}>
            Sign in to continue
          </h1>
          <p style={{ color: "var(--muted)", fontSize: ".92rem", marginBottom: "1.6rem" }}>
            Your submissions and moderation history are private to your account. Sign in with Google
            to get started.
          </p>

          <button
            className="btn btn-primary"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              signIn("google", { callbackUrl: "/" });
            }}
            style={{ width: "100%", justifyContent: "center", gap: ".6rem" }}
          >
            <GoogleMark />
            {loading ? "Redirecting…" : "Continue with Google"}
          </button>

          <p style={{ color: "var(--faint)", fontSize: ".78rem", marginTop: "1.2rem" }}>
            We only use your name and email to identify your history. Nothing is shared with other users.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.9 35.6 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
