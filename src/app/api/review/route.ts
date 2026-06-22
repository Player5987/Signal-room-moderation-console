// POST /api/review
// Body: { contentItemId: string, decision: "approve"|"remove"|"override", note?: string }
//
// Records a human's decision. This is the "human-in-the-loop" audit trail
// that trust & safety teams care about: every automated verdict can be
// confirmed or overturned by a person, and we keep the history.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_DECISIONS = ["approve", "remove", "override"];

export async function POST(req: NextRequest) {
  let body: { contentItemId?: string; decision?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { contentItemId, decision, note } = body;

  if (!contentItemId || !decision) {
    return NextResponse.json(
      { error: "Fields 'contentItemId' and 'decision' are required." },
      { status: 400 },
    );
  }
  if (!VALID_DECISIONS.includes(decision)) {
    return NextResponse.json(
      { error: `'decision' must be one of: ${VALID_DECISIONS.join(", ")}.` },
      { status: 400 },
    );
  }

  const item = await prisma.contentItem.findUnique({ where: { id: contentItemId } });
  if (!item) {
    return NextResponse.json({ error: "Content item not found." }, { status: 404 });
  }

  // In Stage 1 we attach reviews to the seeded demo reviewer. Once you add
  // real auth (Auth.js / Clerk), swap this for the logged-in user's id.
  const reviewer = await prisma.user.findFirst({ where: { role: "reviewer" } });
  if (!reviewer) {
    return NextResponse.json(
      { error: "No reviewer user found. Run `npm run db:seed`." },
      { status: 500 },
    );
  }

  const review = await prisma.reviewAction.create({
    data: {
      contentItemId,
      reviewerId: reviewer.id,
      decision,
      note: note ?? null,
    },
    include: { reviewer: { select: { name: true } } },
  });

  return NextResponse.json({ review }, { status: 201 });
}
