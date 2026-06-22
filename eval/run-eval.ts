// Runs the moderation classifier over the labeled dataset and reports how good
// it is. Run with:  npm run eval
//
// It reuses the EXACT classifier from src/lib/moderation.ts, so the numbers
// reflect what the app actually does. With OPENAI_API_KEY set you measure the
// real LLM; without it you measure the mock engine.

import "dotenv/config"; // load .env so the Gemini/OpenAI key is available to this script
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { moderate } from "../src/lib/moderation";
import { DEFAULT_POLICIES, categoryIds } from "../src/lib/policies";
import { evaluate, Prediction } from "./metrics";

interface Example {
  id: string;
  text: string;
  expected: string;
}

async function main() {
  const datasetPath = join(process.cwd(), "eval", "dataset.json");
  const dataset: Example[] = JSON.parse(readFileSync(datasetPath, "utf-8"));

  console.log(`\nRunning classifier over ${dataset.length} labeled examples...\n`);

  const preds: Prediction[] = [];
  let engineUsed = "mock";
  for (const ex of dataset) {
    const verdict = await moderate(ex.text);
    engineUsed = verdict.engine;
    preds.push({ expected: ex.expected, predicted: verdict.category });
    const mark = ex.expected === verdict.category ? "ok " : "MISS";
    console.log(
      `  ${mark}  expected=${ex.expected.padEnd(12)} got=${verdict.category.padEnd(12)} "${ex.text.slice(0, 38)}"`,
    );
  }

  const report = evaluate(preds, categoryIds(DEFAULT_POLICIES));

  // Headline numbers.
  console.log("\n=== Summary ===");
  console.log(`  engine:          ${engineUsed}`);
  console.log(`  examples:        ${report.total}`);
  console.log(`  accuracy:        ${(report.accuracy * 100).toFixed(1)}%`);
  console.log(`  macro precision: ${(report.macroPrecision * 100).toFixed(1)}%`);
  console.log(`  macro recall:    ${(report.macroRecall * 100).toFixed(1)}%`);
  console.log(`  macro F1:        ${(report.macroF1 * 100).toFixed(1)}%`);

  // Per-category table.
  console.log("\n=== Per category ===");
  console.log("  category        support  precision  recall    f1");
  for (const m of report.perCategory) {
    console.log(
      `  ${m.category.padEnd(14)}  ${String(m.support).padStart(7)}  ` +
        `${(m.precision * 100).toFixed(0).padStart(8)}%  ` +
        `${(m.recall * 100).toFixed(0).padStart(6)}%  ` +
        `${(m.f1 * 100).toFixed(0).padStart(4)}%`,
    );
  }

  // Persist for the /eval page in the app.
  const out = { ...report, engine: engineUsed, ranAt: new Date().toISOString() };
  const outPath = join(process.cwd(), "eval", "results.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\nSaved results to eval/results.json\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
