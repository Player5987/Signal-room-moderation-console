// PATCH  /api/policies/[id]  — toggle active, or edit label/description
// DELETE /api/policies/[id]  — remove a policy (built-ins can be deactivated but
//                              are blocked from deletion to keep the demo sane)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  return (session?.user as { role?: string })?.role === "admin";
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  let body: { active?: boolean; label?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const data: { active?: boolean; label?: string; description?: string } = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (body.label?.trim()) data.label = body.label.trim();
  if (body.description?.trim()) data.description = body.description.trim();

  try {
    const policy = await prisma.policy.update({ where: { id: params.id }, data });
    return NextResponse.json({ policy });
  } catch {
    return NextResponse.json({ error: "Policy not found." }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const policy = await prisma.policy.findUnique({ where: { id: params.id } });
  if (!policy) return NextResponse.json({ error: "Policy not found." }, { status: 404 });
  if (policy.builtin) {
    return NextResponse.json(
      { error: "Built-in policies can be deactivated but not deleted." },
      { status: 403 },
    );
  }
  await prisma.policy.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
