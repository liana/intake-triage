// Reading and writing intakes. Owns Prisma and the JSON boundary so components
// never touch either. SQLite has no scalar lists, so `constraints` is a JSON
// string and is parsed here with Zod rather than trusted.
import * as z from 'zod/v4';

import { prisma } from './db';
import type { IntakeInput } from './intake-input';
import { ACTION_TIER, type ConstraintName, type RiskLevel } from './risk';
import { constraintAssessmentSchema, type ConstraintAssessment } from './triage-schema';

const storedConstraintsSchema = z.array(constraintAssessmentSchema);

/** Null when triage never ran, and when it stored something we can no longer trust. */
function parseConstraints(json: string | null): ConstraintAssessment[] | null {
  if (!json) return null;
  try {
    const parsed = storedConstraintsSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export type IntakeListItem = {
  id: string;
  title: string;
  companyName: string;
  createdAt: Date;
  technicalPattern: string | null;
  engagementShape: string | null;
  primaryConstraint: string | null;
  overallRisk: RiskLevel | null;
  actionTier: string | null;
  constraints: ConstraintAssessment[] | null;
};

const RISK_LEVEL_VALUES: readonly string[] = ['Low', 'Medium', 'High'];

function asRiskLevel(value: string | null): RiskLevel | null {
  return value !== null && RISK_LEVEL_VALUES.includes(value) ? (value as RiskLevel) : null;
}

/** Persists a submission. AI columns stay null until triage is wired in at Gate 6. */
export async function createIntake(input: IntakeInput): Promise<{ id: string }> {
  const { id } = await prisma.intake.create({ data: input, select: { id: true } });
  return { id };
}

export async function listIntakes(): Promise<IntakeListItem[]> {
  const rows = await prisma.intake.findMany({ orderBy: { createdAt: 'desc' } });

  return rows.map((row) => {
    const overallRisk = asRiskLevel(row.overallRisk);
    return {
      id: row.id,
      title: row.title,
      companyName: row.companyName,
      createdAt: row.createdAt,
      technicalPattern: row.technicalPattern,
      engagementShape: row.engagementShape,
      primaryConstraint: row.primaryConstraint,
      overallRisk,
      actionTier: overallRisk ? ACTION_TIER[overallRisk] : null,
      constraints: parseConstraints(row.constraints),
    };
  });
}

export type { ConstraintAssessment, ConstraintName, RiskLevel };
