// Seeds the five SPEC.md §10 fixtures with their canned triage output, so a fresh
// clone has demoable data without spending an API call. Re-runnable: clears first.
import { PrismaClient } from '@/generated/prisma';
import { fixtures } from './fixtures';

const prisma = new PrismaClient();

async function main() {
  await prisma.intake.deleteMany();

  // Stagger createdAt an hour apart so the list view has a meaningful order.
  for (const [i, { constraints, ...intake }] of fixtures.entries()) {
    await prisma.intake.create({
      data: {
        ...intake,
        constraints: JSON.stringify(constraints),
        createdAt: new Date(Date.now() - (fixtures.length - 1 - i) * 3_600_000),
      },
    });
  }

  const rows = await prisma.intake.findMany({ orderBy: { createdAt: 'asc' } });
  console.log(`Seeded ${rows.length} intakes:\n`);
  for (const row of rows) {
    const parsed = JSON.parse(row.constraints ?? '[]');
    console.log(
      `  ${String(row.overallRisk).padEnd(6)} ${parsed.length} constraints  ` +
        `${String(row.description.length).padStart(4)} chars  ${row.title}`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
