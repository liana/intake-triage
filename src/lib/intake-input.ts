// What a submitter may send. Shared by the form (immediate feedback) and the
// route handler (authoritative) — the client check is a convenience the server
// never trusts. See SPEC.md §8.
import * as z from 'zod/v4';

import { BUDGET_RANGES, INDUSTRIES, TIMELINES } from './vocabularies';

/** Hard caps from SPEC.md §8. They bound the request and the token cost of triage. */
export const FIELD_LIMITS = {
  title: 200,
  description: 5000,
  shortText: 120,
} as const;

export const intakeInputSchema = z.object({
  submitterName: z.string().trim().min(1, 'Add your name').max(FIELD_LIMITS.shortText),
  contactEmail: z
    .email('Enter an email address we can reply to')
    .max(FIELD_LIMITS.shortText),
  companyName: z.string().trim().min(1, 'Add the company name').max(FIELD_LIMITS.shortText),
  title: z
    .string()
    .trim()
    .min(1, 'Add a short title')
    .max(FIELD_LIMITS.title, `Keep the title under ${FIELD_LIMITS.title} characters`),
  description: z
    .string()
    .trim()
    .min(1, 'Describe what you need')
    .max(
      FIELD_LIMITS.description,
      `Keep the description under ${FIELD_LIMITS.description.toLocaleString()} characters`
    ),
  industry: z.enum(INDUSTRIES, { error: 'Choose an industry' }),
  budgetRange: z.enum(BUDGET_RANGES, { error: 'Choose a budget range' }),
  timeline: z.enum(TIMELINES, { error: 'Choose a timeline' }),
});

export type IntakeInput = z.infer<typeof intakeInputSchema>;
