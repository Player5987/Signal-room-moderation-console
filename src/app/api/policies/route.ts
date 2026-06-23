// GET  /api/policies         — list all policies (active and inactive)
// POST /api/policies         — create a new policy { key, label, description }
//
// Creating a policy here changes what the classifier checks for, with no code
// change. That's the Stage 3 payoff.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "admin";
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const policies = await prisma.policy.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ policies });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  let body: { key?: string; label?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const label = body.label?.trim();
  const description = body.description?.trim();
  if (!label || !description) {
    return NextResponse.json(
      { error: "Both 'label' and 'description' are required." },
      { status: 400 },
    );
  }

  // Derive a safe key from the label if one isn't given: "Hate speech" -> "hate_speech".
  const key =
    body.key?.trim() ||
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  if (!key) {
    return NextResponse.json({ error: "Could not derive a valid key." }, { status: 400 });
  }

  const existing = await prisma.policy.findUnique({ where: { key } });
  if (existing) {
    return NextResponse.json({ error: `A policy with key '${key}' already exists.` }, { status: 409 });
  }

  const policy = await prisma.policy.create({
    data: { key, label, description, active: true, builtin: false },
  });
  return NextResponse.json({ policy }, { status: 201 });
}
