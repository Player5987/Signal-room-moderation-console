"use client";

import { useEffect, useState } from "react";

interface CategoryMetrics { category: string; support: number; precision: number; recall: number; f1: number; }
interface Report {
  total: number; accuracy: number; macroPrecision: number; macroRecall: number; macroF1: number;
  perCategory: CategoryMetrics[]; confusion: Record<string, Record<string, number>>;
  labels: string[]; engine: string; ranAt: string;
}

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

export default function EvalPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/eval").then((r) => r.json()).then((d) => (d.error ? setError(d.error) : setReport(d)))
      .catch(() => setError("Could not load eval results."));
  }, []);

  if (error) {
    return (
      <div className="panel reveal" style={{ padding: "1.6rem", color: "var(--muted)" }}>
        {error} Run <span className="mono">npm run eval</span> in your terminal, then refresh.
      </div>
    );
  }
  if (!report) return <p style={{ color: "var(--muted)" }}>Loading…</p>;

  return (
    <div className="reveal">
      <div style={{ marginBottom: "1.4rem" }}>
        <span className="pill pill-muted">model quality</span>
        <h1 className="font-display" style={{ fontSize: "1.9rem", fontWeight: 700, margin: ".5rem 0 .2rem" }}>
          Evaluation
        </h1>
        <p style={{ color: "var(--muted)" }}>
          How the <strong style={{ color: "var(--text)" }}>{report.engine}</strong> engine performed on {report.total} labeled examples · {new Date(report.ranAt).toLocaleString()}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: ".9rem" }}>
        <Metric label="Accuracy" value={pct(report.accuracy)} />
        <Metric label="Macro precision" value={pct(report.macroPrecision)} />
        <Metric label="Macro recall" value={pct(report.macroRecall)} />
        <Metric label="Macro F1" value={pct(report.macroF1)} />
      </div>

      <h2 className="font-display" style={{ fontSize: "1.1rem", fontWeight: 600, margin: "1.6rem 0 .7rem" }}>Per category</h2>
      <div className="panel" style={{ padding: ".4rem 1.2rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".88rem" }}>
          <thead>
            <tr className="mono" style={{ textAlign: "left", color: "var(--muted)" }}>
              <th style={{ padding: ".6rem 0" }}>category</th><th>support</th><th>precision</th><th>recall</th><th>f1</th>
            </tr>
          </thead>
          <tbody>
            {report.perCategory.map((m) => (
              <tr key={m.category} style={{ borderTop: "1px solid var(--line-soft)" }}>
                <td style={{ padding: ".6rem 0", fontWeight: 600 }}>{m.category}</td>
                <td className="mono">{m.support}</td>
                <td className="mono">{pct(m.precision)}</td>
                <td className="mono">{pct(m.recall)}</td>
                <td className="mono" style={{ color: "var(--brand2, #38e0c8)" }}>{pct(m.f1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="font-display" style={{ fontSize: "1.1rem", fontWeight: 600, margin: "1.6rem 0 .5rem" }}>Confusion matrix</h2>
      <p style={{ color: "var(--muted)", fontSize: ".85rem", marginBottom: ".7rem" }}>
        Rows = true label, columns = predicted. The diagonal is correct; off-diagonal cells are errors.
      </p>
      <ConfusionMatrix confusion={report.confusion} labels={report.labels} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel lift" style={{ padding: "1rem 1.1rem" }}>
      <div className="mono" style={{ fontSize: ".68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
      <div className="font-display" style={{ fontSize: "1.9rem", fontWeight: 700, marginTop: ".2rem" }}>{value}</div>
    </div>
  );
}

function ConfusionMatrix({ confusion, labels }: { confusion: Record<string, Record<string, number>>; labels: string[]; }) {
  const rows = labels.filter((l) => Object.values(confusion[l] ?? {}).some((v) => v > 0));
  const max = Math.max(1, ...rows.flatMap((r) => labels.map((c) => confusion[r]?.[c] ?? 0)));
  return (
    <div className="panel" style={{ padding: "1.2rem", overflowX: "auto" }}>
      <table className="mono" style={{ borderCollapse: "separate", borderSpacing: 4, fontSize: ".8rem" }}>
        <thead>
          <tr>
            <th></th>
            {labels.map((c) => (
              <th key={c} style={{ padding: ".3rem", color: "var(--muted)", fontWeight: 600 }}>{c.slice(0, 6)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <td style={{ padding: ".3rem", color: "var(--muted)", fontWeight: 600 }}>{r}</td>
              {labels.map((c) => {
                const v = confusion[r]?.[c] ?? 0;
                const onDiag = r === c;
                const intensity = v / max;
                return (
                  <td key={c} style={{
                    padding: ".5rem", textAlign: "center", minWidth: 40, borderRadius: 6,
                    color: v === 0 ? "var(--line)" : onDiag ? "#06140f" : "#1a0f12",
                    fontWeight: 700,
                    background: v === 0 ? "rgba(255,255,255,0.02)"
                      : onDiag ? `rgba(45,212,167,${0.35 + intensity * 0.6})`
                      : `rgba(251,111,132,${0.3 + intensity * 0.6})`,
                  }}>{v}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
