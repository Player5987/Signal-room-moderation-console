// The classifier. In Stage 3 it takes the policy set as an ARGUMENT instead of
// reading a fixed list, so the rules can change at runtime. The prompt is built
// fresh from whatever policies are passed in.
//
// Two engines, same output shape:
//   1. "llm"  — calls OpenAI, forcing JSON output, prompt built from the policies.
//   2. "mock" — keyword fallback (only knows the built-in categories; brand-new
//               policies only really work with the real LLM, which reads them).

import OpenAI from "openai";
import { PolicySpec, DEFAULT_POLICIES, CLEAN, categoryIds } from "./policies";

export interface ModerationVerdict {
  category: string;
  confidence: number;
  scores: Record<string, number>;
  rationale: string;
  engine: "llm" | "mock" | "vision-llm";
}

// ---------- Build the prompt from a policy set ----------

function buildSystemPrompt(policies: PolicySpec[]): string {
  const ids = categoryIds(policies);
  return `You are a content moderation engine.
Classify the user's content against these policies:
${policies.map((p) => `- ${p.key}: ${p.description}`).join("\n")}

Respond with ONLY a JSON object, no markdown, in exactly this shape:
{
  "category": "<one of: ${ids.join(", ")}>",
  "confidence": <number 0..1>,
  "scores": { ${ids.map((c) => `"${c}": <0..1>`).join(", ")} },
  "rationale": "<one short sentence>"
}
Use "${CLEAN}" when no policy is violated.`;
}

// ---------- Engine 1: the real LLM ----------

async function classifyWithLLM(text: string, policies: PolicySpec[]): Promise<ModerationVerdict> {
  // baseURL + model come from env, so you can point this at OpenAI (default),
  // Gemini's OpenAI-compatible endpoint, or any compatible provider.
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0,
    max_tokens: 1024, // the verdict JSON is tiny; cap output so free tiers accept it
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(policies) },
      { role: "user", content: text },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  return {
    category: parsed.category ?? CLEAN,
    confidence: clamp(parsed.confidence ?? 0),
    scores: normalizeScores(parsed.scores, policies),
    rationale: parsed.rationale ?? "No rationale provided.",
    engine: "llm",
  };
}

// ---------- Engine 2: the mock fallback ----------

const KEYWORDS: Record<string, string[]> = {
  harassment: ["idiot", "kill you", "hate you", "loser", "shut up", "worthless"],
  spam: ["buy now", "free money", "click here", "subscribe", "100% off", "promo"],
  scam: ["wire transfer", "gift card", "verify your account", "prince", "bitcoin", "bank details"],
  sexual: ["xxx", "nudes", "onlyfans"],
  ip_violation: ["replica", "counterfeit", "knockoff", "bootleg", "cracked"],
};

function classifyWithMock(text: string, policies: PolicySpec[]): ModerationVerdict {
  const lower = text.toLowerCase();
  const ids = categoryIds(policies);
  const scores: Record<string, number> = {};
  for (const id of ids) scores[id] = 0;

  for (const p of policies) {
    const words = KEYWORDS[p.key] ?? []; // unknown (user-added) policies have no keywords
    const hits = words.filter((w) => lower.includes(w)).length;
    if (hits > 0) scores[p.key] = Math.min(0.6 + hits * 0.2, 0.99);
  }

  let top = CLEAN;
  let topScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (cat !== CLEAN && score > topScore) {
      top = cat;
      topScore = score;
    }
  }
  if (topScore === 0) {
    scores[CLEAN] = 0.95;
    return { category: CLEAN, confidence: 0.95, scores, rationale: "No flagged keywords detected.", engine: "mock" };
  }
  return {
    category: top,
    confidence: topScore,
    scores,
    rationale: `Matched ${top} keywords (mock engine — add OPENAI_API_KEY for the real model).`,
    engine: "mock",
  };
}

// ---------- Public entry point ----------

export async function moderate(
  text: string,
  policies: PolicySpec[] = DEFAULT_POLICIES,
): Promise<ModerationVerdict> {
  if (process.env.OPENAI_API_KEY) {
    try {
      return await classifyWithLLM(text, policies);
    } catch (err) {
      console.error("LLM classify failed, falling back to mock:", err);
      return classifyWithMock(text, policies);
    }
  }
  return classifyWithMock(text, policies);
}

// ---------- helpers ----------

function clamp(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalizeScores(scores: unknown, policies: PolicySpec[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of categoryIds(policies)) {
    const v = (scores as Record<string, number>)?.[id];
    out[id] = clamp(typeof v === "number" ? v : 0);
  }
  return out;
}
