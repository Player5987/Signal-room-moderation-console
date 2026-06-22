// POST /api/moderate
// Body: { text: string, imageUrl?: string, source?: string }
//
// This is the ingest endpoint. It models SafetyKit-style async flow with
// explicit statuses: an item is created "pending", flipped to "processing"
// while the model runs, then "reviewed"-ready once a verdict is stored.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { moderate } from "@/lib/moderation";
import { moderateImage, combineVerdicts } from "@/lib/imageModeration";
import { DEFAULT_POLICIES } from "@/lib/policies";

export async function POST(req: NextRequest) {
  let body: { text?: string; imageUrl?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Field 'text' is required." }, { status: 400 });
  }

  // 1. Record the item as pending.
  const item = await prisma.contentItem.create({
    data: {
      text,
      imageUrl: body.imageUrl ?? null,
      source: body.source ?? "api",
      status: "processing",
    },
  });

  // 2. Load the currently ACTIVE policies from the DB (Stage 3). The classifier
  //    builds its prompt from these, so editing policies changes behavior live.
  //    Fall back to the built-in defaults if the table is empty.
  const dbPolicies = await prisma.policy.findMany({ where: { active: true } });
  const policies =
    dbPolicies.length > 0
      ? dbPolicies.map((p) => ({ key: p.key, label: p.label, description: p.description }))
      : DEFAULT_POLICIES;

  // Run the text classifier with those policies, plus the image service if an
  // image was supplied and IMAGE_SERVICE_URL is configured. Combine the verdicts.
  const textVerdict = await moderate(text, policies);
  const imageVerdict = body.imageUrl
    ? await moderateImage(body.imageUrl, text)
    : null;
  const verdict = combineVerdicts(textVerdict, imageVerdict);

  // 3. Persist the verdict and mark the item ready for human review.
  await prisma.moderationResult.create({
    data: {
      contentItemId: item.id,
      category: verdict.category,
      confidence: verdict.confidence,
      scores: JSON.stringify(verdict.scores),
      rationale: verdict.rationale,
      engine: verdict.engine,
    },
  });

  await prisma.contentItem.update({
    where: { id: item.id },
    data: { status: "reviewed" },
  });

  return NextResponse.json({ id: item.id, verdict }, { status: 201 });
}
