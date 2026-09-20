'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FIELD_LIMITS, intakeInputSchema, type IntakeInput } from '@/lib/intake-input';
import { BUDGET_RANGES, INDUSTRIES, TIMELINES } from '@/lib/vocabularies';

const field =
  'w-full rounded-sm border border-rule bg-sheet px-3 py-2 text-body text-ink placeholder:text-muted';
const labelText = 'block text-meta font-medium text-muted';

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className={labelText} htmlFor={htmlFor}>
          {label}
        </label>
        {hint}
      </div>
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-1 text-meta text-risk-high">{error}</p> : null}
    </div>
  );
}

export function NewRequestForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<IntakeInput>({ resolver: zodResolver(intakeInputSchema) });

  const described = watch('description')?.length ?? 0;
  const overCap = described > FIELD_LIMITS.description;

  async function onSubmit(values: IntakeInput) {
    setServerError(null);

    const response = await fetch('/api/intakes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setServerError(body?.error ?? 'Could not save this request. Try again.');
      return;
    }

    const { id } = await response.json();
    // refresh() so the list is not served from the client router cache.
    router.refresh();
    router.push(`/intakes/${id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {serverError ? (
        <p className="rounded-sm border border-risk-high px-3 py-2 text-body text-risk-high" role="alert">
          {serverError}
        </p>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Your name" htmlFor="submitterName" error={errors.submitterName?.message}>
          <input id="submitterName" className={field} {...register('submitterName')} />
        </Field>
        <Field label="Email" htmlFor="contactEmail" error={errors.contactEmail?.message}>
          <input id="contactEmail" type="email" className={field} {...register('contactEmail')} />
        </Field>
      </div>

      <Field label="Company" htmlFor="companyName" error={errors.companyName?.message}>
        <input id="companyName" className={field} {...register('companyName')} />
      </Field>

      <Field label="Title" htmlFor="title" error={errors.title?.message}>
        <input
          id="title"
          className={field}
          placeholder="One line on what you are asking for"
          {...register('title')}
        />
      </Field>

      <Field
        label="What do you need?"
        htmlFor="description"
        error={errors.description?.message}
        hint={
          <span className={`tabular text-meta ${overCap ? 'text-risk-high' : 'text-muted'}`}>
            {described.toLocaleString()} / {FIELD_LIMITS.description.toLocaleString()}
          </span>
        }
      >
        <textarea
          id="description"
          rows={10}
          className={field}
          placeholder="The problem, what you have already tried, where your data lives, and anything that constrains how this can be run."
          {...register('description')}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-3">
        <Field label="Industry" htmlFor="industry" error={errors.industry?.message}>
          <select id="industry" className={field} defaultValue="" {...register('industry')}>
            <option value="" disabled>
              Choose one
            </option>
            {INDUSTRIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Budget" htmlFor="budgetRange" error={errors.budgetRange?.message}>
          <select id="budgetRange" className={field} defaultValue="" {...register('budgetRange')}>
            <option value="" disabled>
              Choose one
            </option>
            {BUDGET_RANGES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Timeline" htmlFor="timeline" error={errors.timeline?.message}>
          <select id="timeline" className={field} defaultValue="" {...register('timeline')}>
            <option value="" disabled>
              Choose one
            </option>
            {TIMELINES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex items-center gap-4 border-t border-rule pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-sm bg-accent px-4 py-2 text-body font-medium text-sheet hover:bg-accent-strong disabled:opacity-60"
        >
          {isSubmitting ? 'Saving…' : 'Submit request'}
        </button>
        {isSubmitting ? <span className="text-meta text-muted">Saving your request.</span> : null}
      </div>
    </form>
  );
}
