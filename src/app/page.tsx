"use client";

import { useState } from "react";

interface Verdict {
  category: string;
  confidence: number;
  scores: Record<string, number>;
  rationale: string;
  language?: string;
  engine: "llm" | "mock" | "vision-llm";
}

export default function SubmitPage() {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    setVerdict(null);
    try {
      const res = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, imageUrl: imageUrl.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setVerdict(data.verdict);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  const flagged = verdict && verdict.category !== "clean";

  return (
    <div className="reveal">
      <div style={{ marginBottom: "1.5rem" }}>
        <span className="pill pill-muted">intake</span>
        <h1 className="font-display" style={{ fontSize: "1.9rem", fontWeight: 700, margin: ".5rem 0 .2rem" }}>
          Submit content for review
        </h1>
        <p style={{ color: "var(--muted)" }}>
          The model classifies each message against your active policies. Flagged items go to the queue.
        </p>
      </div>

      <div className="panel" style={{ padding: "1.3rem" }}>
        <textarea
          className="field"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Buy now! 100% off luxury replica watches, click here…"
          rows={5}
          style={{ resize: "vertical" }}
        />

        <label className="mono" style={{ display: "block", marginTop: "1rem", fontSize: ".72rem", color: "var(--muted)", textTransform: "uppercase" }}>
          Image URL (optional)
        </label>
        <input
          type="url"
          className="field"
          style={{ marginTop: ".4rem" }}
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/replica_handbag_logo.jpg"
        />
        <p style={{ marginTop: ".4rem", fontSize: ".78rem", color: "var(--faint)" }}>
          Routed to the image service when it&apos;s running; otherwise ignored.
        </p>

        <button
          className="btn btn-primary"
          onClick={submit}
          disabled={loading || !text.trim()}
          style={{ marginTop: "1rem" }}
        >
          {loading ? "Classifying…" : "Run moderation"}
        </button>
      </div>

      {error && <p style={{ marginTop: "1rem", color: "var(--danger)" }}>{error}</p>}

      {verdict && (
        <div className="panel lift reveal-2" style={{ padding: "1.3rem", marginTop: "1.2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".7rem" }}>
            <span className={`pill ${flagged ? "pill-warn" : "pill-ok"}`}>
              {flagged ? "⚑ " + verdict.category : "✓ clean"}
            </span>
            <span className="mono" style={{ fontSize: ".82rem", color: "var(--muted)" }}>
              {(verdict.confidence * 100).toFixed(0)}% confidence · {verdict.engine} engine
              {verdict.language && verdict.language !== "unknown" ? ` · ${verdict.language}` : ""}
            </span>
          </div>
          <p style={{ marginTop: ".7rem", fontSize: ".95rem" }}>{verdict.rationale}</p>
          <ScoreBars scores={verdict.scores} />
        </div>
      )}
    </div>
  );
}

function ScoreBars({ scores }: { scores: Record<string, number> }) {
  const entries = Object.entries(scores).filter(([k]) => k !== "clean").sort((a, b) => b[1] - a[1]);
  return (
    <div style={{ marginTop: "1rem", display: "grid", gap: ".5rem" }}>
      {entries.map(([cat, score]) => (
        <div key={cat} style={{ display: "flex", alignItems: "center", gap: ".7rem" }}>
          <span className="mono" style={{ width: 110, fontSize: ".76rem", color: "var(--muted)" }}>{cat}</span>
          <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 999 }}>
            <div
              style={{
                width: `${score * 100}%`,
                height: "100%",
                borderRadius: 999,
                background: score > 0.5 ? "var(--warn)" : "var(--brand)",
                boxShadow: score > 0.5 ? "0 0 12px var(--warn)" : "none",
                transition: "width .5s cubic-bezier(.2,.7,.2,1)",
              }}
            />
          </div>
          <span className="mono" style={{ width: 34, fontSize: ".76rem", textAlign: "right" }}>
            {(score * 100).toFixed(0)}
          </span>
        </div>
      ))}
    </div>
  );
}
