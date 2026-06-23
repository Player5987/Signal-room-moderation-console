// POST /api/moderate  { text, imageUrl? }
// Classifies content against active policies and stores it under the signed-in user.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { moderate } from "@/lib/moderation";
import { moderateImage, combineVerdicts } from "@/lib/imageModeration";
import { DEFAULT_POLICIES } from "@/lib/policies";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: { text?: string; imageUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Field 'text' is required." }, { status: 400 });
  }

  // 1. Record the item, owned by this user.
  const item = await prisma.contentItem.create({
    data: { text, imageUrl: body.imageUrl ?? null, source: "web", status: "processing", userId: session.user.id },
  });

  // 2. Classify against the active policies (multilingual via the LLM).
  const dbPolicies = await prisma.policy.findMany({ where: { active: true } });
  const policies =
    dbPolicies.length > 0
      ? dbPolicies.map((p) => ({ key: p.key, label: p.label, description: p.description }))
      : DEFAULT_POLICIES;

  const textVerdict = await moderate(text, policies);
  const imageVerdict = body.imageUrl ? await moderateImage(body.imageUrl, text) : null;
  const verdict = combineVerdicts(textVerdict, imageVerdict);

  // 3. Store the verdict and mark reviewed-ready.
  await prisma.moderationResult.create({
    data: {
      contentItemId: item.id,
      category: verdict.category,
      confidence: verdict.confidence,
      scores: JSON.stringify(verdict.scores),
      rationale: verdict.rationale,
      language: (verdict as { language?: string }).language ?? "unknown",
      engine: verdict.engine,
    },
  });
  await prisma.contentItem.update({ where: { id: item.id }, data: { status: "reviewed" } });

  return NextResponse.json({ id: item.id, verdict }, { status: 201 });
}
