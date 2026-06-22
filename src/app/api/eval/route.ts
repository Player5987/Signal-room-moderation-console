// GET /api/eval
// Returns the most recent evaluation run (written by `npm run eval`).
// If no run exists yet, returns 404 so the page can prompt the user to run it.

import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const path = join(process.cwd(), "eval", "results.json");
    const data = JSON.parse(readFileSync(path, "utf-8"));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "No eval results yet. Run `npm run eval` first." },
      { status: 404 },
    );
  }
}
