// SPEC.md §6. Reads in the UI go straight through a Server Component to the lib
// layer; writes go over this API, so the endpoint has a real consumer and a
// headless verification path.
import * as z from 'zod/v4';

import { intakeInputSchema } from '@/lib/intake-input';
import { createIntake, listIntakes } from '@/lib/intakes';
import { triage, type TriageResult } from '@/lib/triage';

export async function GET() {
  return Response.json(await listIntakes());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const parsed = intakeInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'That submission is not valid', fields: z.flattenError(parsed.error).fieldErrors },
      { status: 400 }
    );
  }

  // Filing the request is the job; triage is additive. A model error, a timeout,
  // or output that fails the schema leaves the intake persisted with null AI
  // columns and the detail page explaining itself. SPEC.md §7.
  let result: TriageResult | null = null;
  try {
    result = await triage(parsed.data);
  } catch (error) {
    console.error('Triage failed; persisting the intake untriaged.', error);
  }

  const intake = await createIntake(parsed.data, result);
  return Response.json(intake, { status: 201 });
}
