// GET /api/queue?filter=flagged|all
// Returns content items with their model verdict and any human reviews,
// newest first. This feeds the review dashboard.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLEAN } from "@/lib/policies";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const filter = req.nextUrl.searchParams.get("filter") ?? "flagged";

  const items = await prisma.contentItem.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      result: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { reviewer: { select: { name: true } } },
      },
    },
  });

  // "flagged" hides items the model marked clean, so reviewers focus on risk.
  const visible =
    filter === "all"
      ? items
      : items.filter((i) => i.result && i.result.category !== CLEAN);

  // Parse the JSON-string scores back into objects for the client.
  const shaped = visible.map((i) => ({
    ...i,
    result: i.result
      ? { ...i.result, scores: JSON.parse(i.result.scores) as Record<string, number> }
      : null,
  }));

  return NextResponse.json({ items: shaped });
}
