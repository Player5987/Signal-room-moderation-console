// POST /api/review  { contentItemId, decision, note? }
// Admin-only. The reviewer is the signed-in admin.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID = ["approve", "remove", "override"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin" || !session?.user?.id) {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  let body: { contentItemId?: string; decision?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { contentItemId, decision, note } = body;
  if (!contentItemId || !decision || !VALID.includes(decision)) {
    return NextResponse.json({ error: "Valid 'contentItemId' and 'decision' required." }, { status: 400 });
  }

  const item = await prisma.contentItem.findUnique({ where: { id: contentItemId } });
  if (!item) return NextResponse.json({ error: "Content item not found." }, { status: 404 });

  const review = await prisma.reviewAction.create({
    data: { contentItemId, reviewerId: session.user.id, decision, note: note ?? null },
    include: { reviewer: { select: { name: true } } },
  });
  return NextResponse.json({ review }, { status: 201 });
}
