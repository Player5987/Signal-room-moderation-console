// The classifier. Takes the policy set as an argument (set at runtime), builds
// the prompt from it, and classifies content in ANY language.
//
// Two engines, same output shape:
//   1. "llm"  — calls an OpenAI-compatible API, JSON mode, language-agnostic.
//   2. "mock" — keyword fallback (English-only; real multilingual needs the LLM).

import OpenAI from "openai";
import { PolicySpec, DEFAULT_POLICIES, CLEAN, categoryIds } from "./policies";

export interface ModerationVerdict {
  category: string;
  confidence: number;
  scores: Record<string, number>;
  rationale: string;
  language: string; // detected language, e.g. "English", "Hindi", "Spanish"
  engine: "llm" | "mock" | "vision-llm";
}

function buildSystemPrompt(policies: PolicySpec[]): string {
  const ids = categoryIds(policies);
  return `You are a multilingual content moderation engine.
The content may be written in ANY language (English, Hindi, Spanish, Arabic, French, etc.),
including transliterated or mixed-language text. Detect violations based on MEANING, not keywords,
and classify identically regardless of the language used.

Classify the content against these policies:
${policies.map((p) => `- ${p.key}: ${p.description}`).join("\n")}

Respond with ONLY a JSON object, no markdown, in exactly this shape:
{
  "category": "<one of: ${ids.join(", ")}>",
  "confidence": <number 0..1>,
  "scores": { ${ids.map((c) => `"${c}": <0..1>`).join(", ")} },
  "language": "<the language the content is written in>",
  "rationale": "<one short sentence, in English>"
}
Use "${CLEAN}" when no policy is violated.`;
}

// ---------- Engine 1: the real LLM ----------

async function classifyWithLLM(text: string, policies: PolicySpec[]): Promise<ModerationVerdict> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0,
    max_tokens: 1024,
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
    language: typeof parsed.language === "string" ? parsed.language : "unknown",
    engine: "llm",
  };
}

// ---------- Engine 2: the mock fallback (English keywords only) ----------

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
    const words = KEYWORDS[p.key] ?? [];
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
    return { category: CLEAN, confidence: 0.95, scores, rationale: "No flagged keywords detected.", language: "unknown", engine: "mock" };
  }
  return {
    category: top,
    confidence: topScore,
    scores,
    rationale: `Matched ${top} keywords (mock engine — add an API key for the real multilingual model).`,
    language: "unknown",
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
