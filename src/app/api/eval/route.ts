// GET /api/eval — latest evaluation results (admin only).
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }
  try {
    const data = JSON.parse(readFileSync(join(process.cwd(), "eval", "results.json"), "utf-8"));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "No eval results yet. Run `npm run eval` first." }, { status: 404 });
  }
}
