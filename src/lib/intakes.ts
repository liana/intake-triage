// Reading and writing intakes. Owns Prisma and the JSON boundary so components
// never touch either. SQLite has no scalar lists, so `constraints` is a JSON
// string and is parsed here with Zod rather than trusted.
import * as z from 'zod/v4';

import { prisma } from './db';
import type { IntakeInput } from './intake-input';
import { ACTION_TIER, type ConstraintName, type RiskLevel } from './risk';
// Type-only: importing the module would pull the Anthropic SDK into every
// caller of this one, including the list page.
import type { TriageResult } from './triage';
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

const RISK_LEVEL_VALUES: readonly string[] = ['Low', 'Medium', 'High'];

function asRiskLevel(value: string | null): RiskLevel | null {
  return value !== null && RISK_LEVEL_VALUES.includes(value) ? (value as RiskLevel) : null;
}

/** The triage half of an intake, present only when all of it survived. */
export type Triage = {
  summary: string;
  technicalPattern: string;
  engagementShape: string;
  primaryConstraint: string;
  overallRisk: RiskLevel;
  actionTier: string;
  recommendedAction: string;
  constraints: ConstraintAssessment[];
};

type IntakeRow = {
  summary: string | null;
  technicalPattern: string | null;
  engagementShape: string | null;
  primaryConstraint: string | null;
  overallRisk: string | null;
  recommendedAction: string | null;
  constraints: string | null;
};

/**
 * All of it or none of it. A row half-written by a failed triage reads as
 * untriaged rather than rendering a summary with no risk against it.
 */
function toTriage(row: IntakeRow): Triage | null {
  const constraints = parseConstraints(row.constraints);
  const overallRisk = asRiskLevel(row.overallRisk);

  if (
    !constraints ||
    !overallRisk ||
    !row.summary ||
    !row.technicalPattern ||
    !row.engagementShape ||
    !row.primaryConstraint ||
    !row.recommendedAction
  ) {
    return null;
  }

  return {
    summary: row.summary,
    technicalPattern: row.technicalPattern,
    engagementShape: row.engagementShape,
    primaryConstraint: row.primaryConstraint,
    overallRisk,
    actionTier: ACTION_TIER[overallRisk],
    recommendedAction: row.recommendedAction,
    constraints,
  };
}

export type IntakeListItem = {
  id: string;
  title: string;
  companyName: string;
  createdAt: Date;
  triage: Triage | null;
};

export type IntakeDetail = IntakeListItem & {
  submitterName: string;
  contactEmail: string;
  description: string;
  industry: string;
  budgetRange: string;
  timeline: string;
};

/** Columns written only when triage succeeded; null on failure is the error path. */
function triageColumns(triage: TriageResult | null) {
  if (!triage) return {};
  return {
    summary: triage.summary,
    technicalPattern: triage.technicalPattern,
    engagementShape: triage.engagementShape,
    primaryConstraint: triage.primaryConstraint,
    overallRisk: triage.overallRisk,
    recommendedAction: triage.recommendedAction,
    constraints: JSON.stringify(triage.constraints),
  };
}

export async function createIntake(
  input: IntakeInput,
  triage: TriageResult | null
): Promise<IntakeDetail> {
  const row = await prisma.intake.create({ data: { ...input, ...triageColumns(triage) } });
  return toDetail(row);
}

export async function listIntakes(): Promise<IntakeListItem[]> {
  const rows = await prisma.intake.findMany({ orderBy: { createdAt: 'desc' } });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    companyName: row.companyName,
    createdAt: row.createdAt,
    triage: toTriage(row),
  }));
}

export async function getIntake(id: string): Promise<IntakeDetail | null> {
  const row = await prisma.intake.findUnique({ where: { id } });
  return row ? toDetail(row) : null;
}

function toDetail(row: Awaited<ReturnType<typeof prisma.intake.create>>): IntakeDetail {
  return {
    id: row.id,
    title: row.title,
    companyName: row.companyName,
    createdAt: row.createdAt,
    submitterName: row.submitterName,
    contactEmail: row.contactEmail,
    description: row.description,
    industry: row.industry,
    budgetRange: row.budgetRange,
    timeline: row.timeline,
    triage: toTriage(row),
  };
}

export type { ConstraintAssessment, ConstraintName, RiskLevel };
