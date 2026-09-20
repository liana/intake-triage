// SPEC.md §6. Reads in the UI go straight through a Server Component to the lib
// layer; writes go over this API, so the endpoint has a real consumer and a
// headless verification path.
import * as z from 'zod/v4';

import { intakeInputSchema } from '@/lib/intake-input';
import { createIntake, listIntakes } from '@/lib/intakes';

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

  const { id } = await createIntake(parsed.data);
  return Response.json({ id }, { status: 201 });
}
