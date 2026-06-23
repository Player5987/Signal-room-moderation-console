// GET /api/admin/stats — aggregate metrics for the admin dashboard.
// Protected by middleware (admin cookie required).

import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CLEAN } from "@/lib/policies";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }
  const [total, items, reviews, activePolicies, totalPolicies] = await Promise.all([
    prisma.contentItem.count(),
    prisma.contentItem.findMany({ include: { result: true }, orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.reviewAction.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { reviewer: { select: { name: true } }, contentItem: { select: { text: true } } },
    }),
    prisma.policy.count({ where: { active: true } }),
    prisma.policy.count(),
  ]);

  // Category breakdown from model verdicts.
  const byCategory: Record<string, number> = {};
  let flagged = 0;
  let engineLlm = 0;
  for (const it of items) {
    const cat = it.result?.category ?? "unscored";
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    if (it.result && it.result.category !== CLEAN) flagged += 1;
    if (it.result && it.result.engine !== "mock") engineLlm += 1;
  }

  const reviewedCount = await prisma.reviewAction.count();

  // Latest eval summary, if present.
  let evalSummary: { accuracy: number; macroF1: number; engine: string; ranAt: string } | null = null;
  try {
    const data = JSON.parse(readFileSync(join(process.cwd(), "eval", "results.json"), "utf-8"));
    evalSummary = { accuracy: data.accuracy, macroF1: data.macroF1, engine: data.engine, ranAt: data.ranAt };
  } catch {
    evalSummary = null;
  }

  return NextResponse.json({
    totals: {
      items: total,
      flagged,
      clean: total - flagged,
      reviews: reviewedCount,
      activePolicies,
      totalPolicies,
      llmShare: total ? Math.round((engineLlm / total) * 100) : 0,
    },
    byCategory,
    recentReviews: reviews.map((r) => ({
      id: r.id,
      decision: r.decision,
      reviewer: r.reviewer.name,
      text: r.contentItem.text,
      at: r.createdAt,
    })),
    evalSummary,
  });
}
