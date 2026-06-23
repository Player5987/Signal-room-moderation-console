// Calls the image-moderation microservice (services/image-moderation) over HTTP.
// Only runs when IMAGE_SERVICE_URL is set, so the text-only flow is unaffected
// if the Python service isn't running. Returns null on any failure — the caller
// then just relies on the text verdict (graceful degradation again).

import type { ModerationVerdict } from "./moderation";

export async function moderateImage(
  imageUrl: string,
  context?: string,
): Promise<ModerationVerdict | null> {
  const base = process.env.IMAGE_SERVICE_URL;
  if (!base) return null;

  try {
    const res = await fetch(`${base}/moderate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl, context }),
    });
    if (!res.ok) return null;
    const v = await res.json();
    return {
      category: v.category,
      confidence: v.confidence,
      scores: v.scores,
      rationale: v.rationale,
        language: v.language ?? "unknown",
      engine: v.engine, // "vision-llm" or "mock"
    };
  } catch (err) {
    console.error("image service call failed:", err);
    return null;
  }
}

// Combine a text and an image verdict into one. Rule: whichever flags the
// higher-confidence violation wins; if both are clean, stay clean. This is a
// simple, defensible fusion policy you can make smarter later.
export function combineVerdicts(
  text: ModerationVerdict,
  image: ModerationVerdict | null,
): ModerationVerdict {
  if (!image) return text;
  const textRisk = text.category === "clean" ? 0 : text.confidence;
  const imageRisk = image.category === "clean" ? 0 : image.confidence;
  return imageRisk > textRisk ? image : text;
}
