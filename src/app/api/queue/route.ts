// GET /api/queue?filter=flagged|all
// Normal users see ONLY their own items. Admins see everyone's.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CLEAN } from "@/lib/policies";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const isAdmin = (session.user as { role?: string }).role === "admin";
  const filter = req.nextUrl.searchParams.get("filter") ?? "flagged";

  const items = await prisma.contentItem.findMany({
    // Ownership scope: admins see all, users see only their own.
    where: isAdmin ? {} : { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      result: true,
      user: { select: { name: true, email: true } },
      reviews: { orderBy: { createdAt: "desc" }, include: { reviewer: { select: { name: true } } } },
    },
  });

  const visible =
    filter === "all" ? items : items.filter((i) => i.result && i.result.category !== CLEAN);

  const shaped = visible.map((i) => ({
    ...i,
    result: i.result
      ? { ...i.result, scores: JSON.parse(i.result.scores) as Record<string, number> }
      : null,
  }));

  return NextResponse.json({ items: shaped, isAdmin });
}
