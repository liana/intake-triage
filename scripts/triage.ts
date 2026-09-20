// Gate 2: run a seed fixture through the real triage call. See SPEC.md §10.
//
//   npm run triage          # fixtures 1 and 2 — the clean / high-risk discrimination check
//   npm run triage -- 3 5   # named fixtures, in order
//
// Prints the submitted intake first, then the model's output, then the comparison
// against the canned triage — in that order, so the canned answers don't anchor
// the read. Categorical fields compare automatically; summary, rationale, and
// mitigation are prose and are there to be judged by eye.
import { ACTION_TIER, CONSTRAINT_PRECEDENCE } from '@/lib/risk';
import { triage, TRIAGE_EFFORT, TRIAGE_MODEL, type TriageResult } from '@/lib/triage';
import { fixtures, type Fixture } from './fixtures';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const OFF = '\x1b[0m';

const rule = (label: string) => `${BOLD}${'═'.repeat(3)} ${label} ${'═'.repeat(Math.max(0, 72 - label.length))}${OFF}`;

function printSubmission(fixture: Fixture, index: number) {
  console.log(`\n${rule(`FIXTURE ${index + 1}`)}`);
  console.log(`${DIM}Submitted by the client — this is everything the model receives.${OFF}\n`);
  const field = (name: string, value: string) => console.log(`  ${DIM}${name.padEnd(12)}${OFF}${value}`);
  field('Submitter', `${fixture.submitterName} <${fixture.contactEmail}>`);
  field('Company', fixture.companyName);
  field('Title', fixture.title);
  field('Industry', fixture.industry);
  field('Budget', fixture.budgetRange);
  field('Timeline', fixture.timeline);
  console.log(`\n  ${DIM}Description (${fixture.description.length} chars)${OFF}\n`);
  for (const para of fixture.description.split('\n')) console.log(`  ${para}`);
}

function printOutput(live: TriageResult, seconds: string) {
  console.log(`\n${rule('MODEL OUTPUT')}`);
  console.log(`${DIM}${TRIAGE_MODEL} · effort ${TRIAGE_EFFORT} · ${seconds}s${OFF}`);

  console.log(`\n  ${BOLD}Summary${OFF}\n  ${live.summary}`);

  console.log(`\n  ${BOLD}Tags${OFF}`);
  console.log(`    ${DIM}Technical Pattern${OFF}   ${live.technicalPattern}`);
  console.log(`    ${DIM}Engagement Shape${OFF}    ${live.engagementShape}`);
  console.log(`    ${DIM}Primary Constraint${OFF}  ${live.primaryConstraint} ${DIM}(derived)${OFF}`);

  console.log(`\n  ${BOLD}Overall risk${OFF}  ${live.overallRisk} ${DIM}(derived from the four levels below)${OFF}`);

  console.log(`\n  ${BOLD}Constraints${OFF}`);
  for (const c of live.constraints) {
    console.log(`\n    ${BOLD}${c.constraint} — ${c.riskLevel}${OFF}`);
    console.log(`      ${DIM}why${OFF}  ${c.rationale}`);
    console.log(`      ${DIM}do${OFF}   ${c.mitigation}`);
  }

  console.log(`\n  ${BOLD}${live.actionTier}${OFF} ${DIM}(tier, derived from ${live.overallRisk})${OFF}`);
  console.log(`    ${live.recommendedAction}`);
}

function printComparison(fixture: Fixture, live: TriageResult) {
  console.log(`\n${rule('AGAINST THE CANNED TRIAGE')}`);
  console.log(`${DIM}The canned values are a hand-written human guess, not ground truth.${OFF}\n`);

  const rows: [string, string, string][] = [
    ['technicalPattern', fixture.technicalPattern, live.technicalPattern],
    ['engagementShape', fixture.engagementShape, live.engagementShape],
    ...CONSTRAINT_PRECEDENCE.map((name): [string, string, string] => [
      name,
      fixture.constraints.find((c) => c.constraint === name)?.riskLevel ?? '—',
      live.constraints.find((c) => c.constraint === name)?.riskLevel ?? '—',
    ]),
    ['overallRisk (derived)', fixture.overallRisk, live.overallRisk],
    ['primaryConstraint (derived)', fixture.primaryConstraint, live.primaryConstraint],
  ];

  console.log(`  ${DIM}${'field'.padEnd(29)}${'canned'.padEnd(36)}live${OFF}`);
  let matches = 0;
  for (const [field, canned, actual] of rows) {
    if (canned === actual) matches++;
    const mark = canned === actual ? `${GREEN}match${OFF}` : `${RED}DIFFERS${OFF}`;
    console.log(`  ${field.padEnd(29)}${canned.padEnd(36)}${actual.padEnd(36)}${mark}`);
  }
  console.log(`\n  ${matches}/${rows.length} categorical fields match`);
}

async function run(index: number) {
  const fixture = fixtures[index];
  printSubmission(fixture, index);

  // The call takes ~15s; say so, or the terminal looks hung.
  process.stdout.write(`\n${DIM}  → calling ${TRIAGE_MODEL} at effort ${TRIAGE_EFFORT}…${OFF}`);
  const startedAt = Date.now();
  const live = await triage(fixture);
  process.stdout.write(`\r${" ".repeat(60)}\r`);
  printOutput(live, ((Date.now() - startedAt) / 1000).toFixed(1));

  printComparison(fixture, live);
}

async function main() {
  const requested = process.argv.slice(2).map(Number);
  const indexes = requested.length > 0 ? requested.map((n) => n - 1) : [0, 1];

  for (const index of indexes) {
    if (!fixtures[index]) throw new Error(`No fixture ${index + 1}; there are ${fixtures.length}`);
    await run(index);
  }
  console.log(`\n${DIM}Action tiers: ${Object.entries(ACTION_TIER).map(([k, v]) => `${k} → ${v}`).join(' · ')}${OFF}\n`);
}

main().catch((error) => {
  console.error(`\n${RED}Triage failed:${OFF}`, error instanceof Error ? error.message : error);
  process.exit(1);
});
