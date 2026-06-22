"use client";

import { useEffect, useState, useCallback } from "react";

interface Policy {
  id: string; key: string; label: string; description: string; active: boolean; builtin: boolean;
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/policies");
    const data = await res.json();
    setPolicies(data.policies ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function addPolicy() {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/policies", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not add policy.");
      setLabel(""); setDescription(""); load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.");
    } finally { setSaving(false); }
  }

  async function toggle(p: Policy) {
    await fetch(`/api/policies/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    load();
  }
  async function remove(p: Policy) {
    await fetch(`/api/policies/${p.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="reveal">
      <div style={{ marginBottom: "1.4rem" }}>
        <span className="pill pill-muted">rules engine</span>
        <h1 className="font-display" style={{ fontSize: "1.9rem", fontWeight: 700, margin: ".5rem 0 .2rem" }}>
          Policies
        </h1>
        <p style={{ color: "var(--muted)" }}>
          Write a rule in plain English; the model enforces it on the next submission. No code, no retraining.
        </p>
      </div>

      <div className="panel" style={{ padding: "1.3rem", marginBottom: "1.5rem" }}>
        <div className="font-display" style={{ fontWeight: 600, marginBottom: ".7rem" }}>Add a policy</div>
        <input className="field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Name, e.g. Gambling" />
        <textarea
          className="field"
          style={{ marginTop: ".5rem", resize: "vertical" }}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Plain-English rule, e.g. Content promoting betting, casinos, or gambling of any kind."
        />
        <button className="btn btn-primary" onClick={addPolicy} disabled={saving || !label.trim() || !description.trim()} style={{ marginTop: ".8rem" }}>
          {saving ? "Adding…" : "Add policy"}
        </button>
        {error && <p style={{ marginTop: ".6rem", color: "var(--danger)" }}>{error}</p>}
      </div>

      <div style={{ display: "grid", gap: ".7rem" }}>
        {policies.map((p) => (
          <div key={p.id} className="panel lift" style={{ padding: "1rem 1.2rem", display: "flex", justifyContent: "space-between", gap: "1rem", opacity: p.active ? 1 : 0.5 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                <span style={{ fontWeight: 700 }}>{p.label}</span>
                <span className="mono" style={{ fontSize: ".72rem", color: "var(--muted)" }}>{p.key}</span>
                {p.builtin && <span className="pill pill-muted">built-in</span>}
              </div>
              <p style={{ marginTop: ".25rem", fontSize: ".9rem", color: "var(--muted)" }}>{p.description}</p>
            </div>
            <div style={{ display: "flex", gap: ".4rem", flexShrink: 0, alignItems: "flex-start" }}>
              <button className="btn" onClick={() => toggle(p)}>{p.active ? "Disable" : "Enable"}</button>
              {!p.builtin && <button className="btn" onClick={() => remove(p)}>Delete</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
