// Policy definitions.
//
// In Stage 3 policies live in the DATABASE so they can be created and edited at
// runtime through the UI. This file keeps the DEFAULT set, which is used to:
//   - seed the database on first run, and
//   - act as a fallback for callers (like the eval script) that don't load
//     policies from the DB.
//
// A PolicySpec is the minimal shape the classifier needs. The DB Policy row is
// mapped to this shape before being passed to the model.

export interface PolicySpec {
  key: string; // short id used as the category, e.g. "harassment"
  label: string; // human-friendly name
  description: string; // the plain-English rule the model reads
}

export const DEFAULT_POLICIES: PolicySpec[] = [
  { key: "harassment", label: "Harassment", description: "Threats, bullying, or targeted abuse toward a person or group." },
  { key: "spam", label: "Spam", description: "Unsolicited promotion, repetitive junk, or misleading links." },
  { key: "scam", label: "Scam / Fraud", description: "Phishing, fake giveaways, or attempts to steal money or data." },
  { key: "sexual", label: "Sexual content", description: "Explicit sexual material or solicitation." },
  { key: "ip_violation", label: "IP violation", description: "Counterfeit goods, piracy, or unauthorized use of a brand." },
];

// The category we use when nothing is flagged.
export const CLEAN = "clean";

// Build the full list of valid category ids for a given policy set.
export function categoryIds(policies: PolicySpec[]): string[] {
  return [...policies.map((p) => p.key), CLEAN];
}
