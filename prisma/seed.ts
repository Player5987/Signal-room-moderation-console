// Seeds the built-in policies and a few sample (system-owned) content items so
// the admin dashboard isn't empty on first run. Users are created automatically
// when people sign in with Google, so we don't seed users here.

import { PrismaClient } from "@prisma/client";
import { moderate } from "../src/lib/moderation";
import { DEFAULT_POLICIES } from "../src/lib/policies";

const prisma = new PrismaClient();

const SAMPLES = [
  "Thanks so much for the detailed write-up, this really helped me!",
  "Buy now! 100% off luxury replica watches, click here to claim.",
  "You're an idiot and everyone hates you, just quit already.",
  "Verify your account immediately or send a gift card to unlock it.",
  "Looking forward to the meetup next week, see you all there.",
];

async function main() {
  for (const p of DEFAULT_POLICIES) {
    await prisma.policy.upsert({
      where: { key: p.key },
      update: {},
      create: { key: p.key, label: p.label, description: p.description, builtin: true },
    });
  }
  console.log(`Seeded ${DEFAULT_POLICIES.length} built-in policies.`);

  for (const text of SAMPLES) {
    const item = await prisma.contentItem.create({
      data: { text, source: "seed", status: "processing" }, // userId null = system content
    });
    const verdict = await moderate(text);
    await prisma.moderationResult.create({
      data: {
        contentItemId: item.id,
        category: verdict.category,
        confidence: verdict.confidence,
        scores: JSON.stringify(verdict.scores),
        rationale: verdict.rationale,
        language: (verdict as { language?: string }).language ?? "unknown",
        engine: verdict.engine,
      },
    });
    await prisma.contentItem.update({ where: { id: item.id }, data: { status: "reviewed" } });
    console.log(`  seeded [${verdict.category}] ${text.slice(0, 38)}…`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
