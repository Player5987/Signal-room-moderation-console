// Seeds a demo reviewer and a handful of content items so the queue isn't
// empty on first run. Run with: npm run db:seed

import { PrismaClient } from "@prisma/client";
import { moderate } from "../src/lib/moderation";
import { DEFAULT_POLICIES } from "../src/lib/policies";

const prisma = new PrismaClient();

const SAMPLES = [
  "Hey, loved your article — really helpful, thanks for sharing!",
  "Buy now! 100% off luxury replica watches, click here to claim.",
  "You're an idiot and everyone hates you, just quit already.",
  "Verify your account immediately or send a gift card to unlock it.",
  "Looking forward to the meetup next week, see you all there.",
];

async function main() {
  // A reviewer to attach human decisions to (until real auth is added).
  const reviewer = await prisma.user.upsert({
    where: { email: "reviewer@example.com" },
    update: {},
    create: { email: "reviewer@example.com", name: "Demo Reviewer", role: "reviewer" },
  });
  console.log("Reviewer ready:", reviewer.name);

  // Seed the built-in policies so the editor starts populated.
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
      data: { text, source: "seed", status: "processing" },
    });
    const verdict = await moderate(text);
    await prisma.moderationResult.create({
      data: {
        contentItemId: item.id,
        category: verdict.category,
        confidence: verdict.confidence,
        scores: JSON.stringify(verdict.scores),
        rationale: verdict.rationale,
        engine: verdict.engine,
      },
    });
    await prisma.contentItem.update({
      where: { id: item.id },
      data: { status: "reviewed" },
    });
    console.log(`  seeded [${verdict.category}] ${text.slice(0, 40)}…`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
