// Schema for what the model returns. See SPEC.md §7 — five fields; overallRisk,
// primaryConstraint, and the action tier are derived in code, not requested here.
//
// Authored against `zod/v4`: that is the subpath @anthropic-ai/sdk/helpers/zod
// imports, and mixing it with the zod v3 root export fails to typecheck.
import * as z from 'zod/v4';

import { CONSTRAINT_PRECEDENCE, RISK_LEVELS } from './risk';
import { ENGAGEMENT_SHAPES, TECHNICAL_PATTERNS } from './vocabularies';

export const constraintAssessmentSchema = z.object({
  constraint: z.enum(CONSTRAINT_PRECEDENCE),
  riskLevel: z.enum(RISK_LEVELS),
  rationale: z.string(),
  mitigation: z.string(),
});

export const triageOutputSchema = z.object({
  summary: z.string(),
  technicalPattern: z.enum(TECHNICAL_PATTERNS),
  engagementShape: z.enum(ENGAGEMENT_SHAPES),
  // Exactly four, enforced in the JSON schema rather than only checked after the
  // fact: it becomes minItems/maxItems at the API boundary instead of a late throw.
  constraints: z.array(constraintAssessmentSchema).length(4),
  recommendedAction: z.string(),
});

export type ConstraintAssessment = z.infer<typeof constraintAssessmentSchema>;
export type TriageOutput = z.infer<typeof triageOutputSchema>;
