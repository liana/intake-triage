// Risk business rules from SPEC.md §4, as data rather than scattered conditionals.
// The model judges each constraint; everything in this file is the arithmetic on top.
// Thresholds are unvalidated placeholders — see DECISIONS.md.

export const RISK_LEVELS = ['Low', 'Medium', 'High'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** Listed in precedence order: this order settles ties for the primary constraint. */
export const CONSTRAINT_PRECEDENCE = [
  'Regulatory & Security',
  'Technical & Data Readiness',
  'Timeline & Scope',
  'Budget & Commercial',
] as const;
export type ConstraintName = (typeof CONSTRAINT_PRECEDENCE)[number];

/** Any one High, or this many Mediums, rolls the whole intake up to High. */
export const MEDIUMS_THAT_MAKE_HIGH = 3;

/** Each overall level maps to a fixed action tier; the model writes the step beneath it. */
export const ACTION_TIER: Record<RiskLevel, string> = {
  High: 'Escalate before quoting',
  Medium: 'Proceed with an explicit plan',
  Low: 'Proceed to scoping',
};

/** Shown when every constraint is Low — there is no constraint worth naming. */
export const NO_PRIMARY_CONSTRAINT = 'None';

type Scored = { constraint: ConstraintName; riskLevel: RiskLevel };

export function rollUpRisk(constraints: Scored[]): RiskLevel {
  const highs = constraints.filter((c) => c.riskLevel === 'High').length;
  const mediums = constraints.filter((c) => c.riskLevel === 'Medium').length;
  if (highs >= 1 || mediums >= MEDIUMS_THAT_MAKE_HIGH) return 'High';
  return mediums >= 1 ? 'Medium' : 'Low';
}

/** The highest-risk constraint, ties broken by CONSTRAINT_PRECEDENCE order. */
export function derivePrimaryConstraint(constraints: Scored[]): ConstraintName | typeof NO_PRIMARY_CONSTRAINT {
  const byPrecedence = CONSTRAINT_PRECEDENCE.map((name) =>
    constraints.find((c) => c.constraint === name)
  ).filter((c) => c !== undefined);

  for (const level of ['High', 'Medium'] as const) {
    const match = byPrecedence.find((c) => c.riskLevel === level);
    if (match) return match.constraint;
  }
  return NO_PRIMARY_CONSTRAINT;
}
