"use client";

import { useEffect, useState, useCallback } from "react";

interface Review {
  id: string;
  decision: string;
  reviewer: { name: string };
}
interface Item {
  id: string;
  text: string;
  createdAt: string;
  result: { category: string; confidence: number; rationale: string; engine: string } | null;
  reviews: Review[];
}

const decisionPill = (d: string) =>
  d === "approve" ? "pill-ok" : d === "remove" ? "pill-danger" : "pill-warn";

export default function QueuePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<"flagged" | "all">("flagged");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/queue?filter=${filter}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function review(contentItemId: string, decision: string) {
    await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentItemId, decision }),
    });
    load();
  }

  return (
    <div className="reveal">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.4rem" }}>
        <div>
          <span className="pill pill-muted">triage</span>
          <h1 className="font-display" style={{ fontSize: "1.9rem", fontWeight: 700, margin: ".5rem 0 0" }}>
            Review queue
          </h1>
        </div>
        <div style={{ display: "flex", gap: ".4rem" }}>
          {(["flagged", "all"] as const).map((f) => (
            <button
              key={f}
              className="btn"
              onClick={() => setFilter(f)}
              style={f === filter ? { borderColor: "var(--brand)", color: "var(--text)" } : {}}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}

      {!loading && items.length === 0 && (
        <div className="panel" style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
          Nothing here yet. Submit content to populate the queue.
        </div>
      )}

      <div style={{ display: "grid", gap: ".8rem" }}>
        {items.map((item) => {
          const flagged = item.result && item.result.category !== "clean";
          const decided = item.reviews.length > 0;
          return (
            <div key={item.id} className="panel lift" style={{ padding: "1.1rem 1.2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: ".6rem" }}>
                <span className={`pill ${flagged ? "pill-warn" : "pill-ok"}`}>
                  {flagged ? "⚑ " + item.result!.category : "✓ clean"}
                </span>
                {item.result && (
                  <span className="mono" style={{ fontSize: ".78rem", color: "var(--muted)" }}>
                    {(item.result.confidence * 100).toFixed(0)}% · {item.result.engine}
                  </span>
                )}
              </div>
              <p style={{ fontSize: ".96rem", marginBottom: ".3rem" }}>{item.text}</p>
              {item.result && (
                <p style={{ fontSize: ".84rem", color: "var(--muted)" }}>{item.result.rationale}</p>
              )}

              {decided ? (
                <div className="mono" style={{ marginTop: ".7rem", fontSize: ".8rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: ".5rem" }}>
                  <span className={`pill ${decisionPill(item.reviews[0].decision)}`}>{item.reviews[0].decision}</span>
                  by {item.reviews[0].reviewer.name}
                </div>
              ) : (
                <div style={{ marginTop: ".8rem", display: "flex", gap: ".4rem" }}>
                  <button className="btn" onClick={() => review(item.id, "approve")}>Approve</button>
                  <button className="btn" onClick={() => review(item.id, "remove")}>Remove</button>
                  <button className="btn" onClick={() => review(item.id, "override")}>Override</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
