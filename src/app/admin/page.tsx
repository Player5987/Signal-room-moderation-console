"use client";

import { useEffect, useState } from "react";

interface Stats {
  totals: {
    items: number;
    flagged: number;
    clean: number;
    reviews: number;
    activePolicies: number;
    totalPolicies: number;
    llmShare: number;
  };
  byCategory: Record<string, number>;
  recentReviews: { id: string; decision: string; reviewer: string; text: string; at: string }[];
  evalSummary: { accuracy: number; macroF1: number; engine: string; ranAt: string } | null;
}

const CAT_COLOR: Record<string, string> = {
  clean: "var(--ok)",
  harassment: "var(--danger)",
  spam: "var(--warn)",
  scam: "var(--warn)",
  sexual: "var(--danger)",
  ip_violation: "var(--brand)",
};

const decisionPill = (d: string) =>
  d === "approve" ? "pill-ok" : d === "remove" ? "pill-danger" : "pill-warn";

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) return <p style={{ color: "var(--muted)" }}>Loading dashboard…</p>;

  const t = stats.totals;
  const catEntries = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...catEntries.map(([, n]) => n));

  return (
    <div className="reveal">
      <div style={{ marginBottom: "1.5rem" }}>
        <span className="pill pill-muted">control room</span>
        <h1 className="font-display" style={{ fontSize: "1.9rem", fontWeight: 700, margin: ".5rem 0 .2rem" }}>
          Dashboard
        </h1>
        <p style={{ color: "var(--muted)" }}>Live picture of everything moving through moderation.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: ".9rem" }}>
        <Stat label="Total reviewed" value={t.items} />
        <Stat label="Flagged" value={t.flagged} tone="warn" />
        <Stat label="Clean" value={t.clean} tone="ok" />
        <Stat label="Human decisions" value={t.reviews} />
        <Stat label="Active policies" value={`${t.activePolicies}/${t.totalPolicies}`} />
        <Stat label="Scored by LLM" value={`${t.llmShare}%`} tone="brand" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "1rem", marginTop: "1.4rem" }}>
        {/* Category breakdown */}
        <div className="panel lift" style={{ padding: "1.2rem" }}>
          <h2 className="font-display" style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "1rem" }}>
            Flag distribution
          </h2>
          {catEntries.length === 0 && <p style={{ color: "var(--muted)" }}>No content scored yet.</p>}
          <div style={{ display: "grid", gap: ".7rem" }}>
            {catEntries.map(([cat, n]) => (
              <div key={cat} style={{ display: "flex", alignItems: "center", gap: ".8rem" }}>
                <span className="mono" style={{ width: 96, fontSize: ".78rem", color: "var(--muted)" }}>
                  {cat}
                </span>
                <div style={{ flex: 1, height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 999 }}>
                  <div
                    style={{
                      width: `${(n / maxCat) * 100}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: CAT_COLOR[cat] ?? "var(--muted)",
                      boxShadow: `0 0 12px ${CAT_COLOR[cat] ?? "transparent"}`,
                      transition: "width .6s cubic-bezier(.2,.7,.2,1)",
                    }}
                  />
                </div>
                <span className="mono" style={{ width: 28, textAlign: "right", fontSize: ".82rem" }}>{n}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Eval snapshot */}
        <div className="panel lift" style={{ padding: "1.2rem" }}>
          <h2 className="font-display" style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "1rem" }}>
            Model quality
          </h2>
          {stats.evalSummary ? (
            <div>
              <div style={{ display: "flex", gap: "1.5rem" }}>
                <Big label="Accuracy" value={`${Math.round(stats.evalSummary.accuracy * 100)}%`} />
                <Big label="Macro F1" value={`${Math.round(stats.evalSummary.macroF1 * 100)}%`} />
              </div>
              <p style={{ color: "var(--muted)", fontSize: ".82rem", marginTop: "1rem" }}>
                <span className={`pill ${stats.evalSummary.engine === "mock" ? "pill-muted" : "pill-ok"}`}>
                  {stats.evalSummary.engine}
                </span>{" "}
                · {new Date(stats.evalSummary.ranAt).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p style={{ color: "var(--muted)", fontSize: ".88rem" }}>
              No evaluation yet. Run <span className="mono">npm run eval</span> to populate this.
            </p>
          )}
        </div>
      </div>

      {/* Recent reviews */}
      <div className="panel" style={{ padding: "1.2rem", marginTop: "1rem" }}>
        <h2 className="font-display" style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "1rem" }}>
          Recent decisions
        </h2>
        {stats.recentReviews.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No human decisions recorded yet.</p>
        ) : (
          <div style={{ display: "grid", gap: ".6rem" }}>
            {stats.recentReviews.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: ".8rem",
                  padding: ".6rem .2rem",
                  borderBottom: "1px solid var(--line-soft)",
                }}
              >
                <span className={`pill ${decisionPill(r.decision)}`}>{r.decision}</span>
                <span style={{ flex: 1, fontSize: ".9rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.text}
                </span>
                <span className="mono" style={{ fontSize: ".75rem", color: "var(--muted)" }}>{r.reviewer}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  const color =
    tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : tone === "brand" ? "var(--brand)" : "var(--text)";
  return (
    <div className="panel lift" style={{ padding: "1rem 1.1rem" }}>
      <div className="mono" style={{ fontSize: ".68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
        {label}
      </div>
      <div className="font-display" style={{ fontSize: "1.8rem", fontWeight: 700, color, marginTop: ".25rem" }}>
        {value}
      </div>
    </div>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display" style={{ fontSize: "2rem", fontWeight: 700 }}>{value}</div>
      <div className="mono" style={{ fontSize: ".7rem", color: "var(--muted)", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}
