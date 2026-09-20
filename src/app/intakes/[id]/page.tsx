import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AssayMark, RiskWord } from '@/components/assay-mark';
import { getIntake, type Triage } from '@/lib/intakes';
import type { RiskLevel } from '@/lib/risk';

// Reads the database on every request; without this Next prerenders the page.
export const dynamic = 'force-dynamic';

const received = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const RISK_BORDER: Record<RiskLevel, string> = {
  Low: 'border-risk-low',
  Medium: 'border-risk-medium',
  High: 'border-risk-high',
};

function Section({ children }: { children: React.ReactNode }) {
  return <section className="border-t border-rule px-8 py-7">{children}</section>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <h2 className="text-meta font-medium text-muted">{children}</h2>;
}

function Analysis({ triage }: { triage: Triage }) {
  return (
    <>
      <Section>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <span className="flex items-center gap-3">
            <span className="text-title">
              <RiskWord level={triage.overallRisk} />
            </span>
            <AssayMark constraints={triage.constraints} />
          </span>
          <span className="font-medium">{triage.actionTier}</span>
        </div>
        <p className="mt-3 max-w-prose">{triage.recommendedAction}</p>
      </Section>

      <Section>
        <dl className="grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="text-meta text-muted">Technical pattern</dt>
            <dd className="mt-0.5 font-medium">{triage.technicalPattern}</dd>
          </div>
          <div>
            <dt className="text-meta text-muted">Engagement shape</dt>
            <dd className="mt-0.5 font-medium">{triage.engagementShape}</dd>
          </div>
          <div>
            <dt className="text-meta text-muted">Watch</dt>
            <dd className="mt-0.5 font-medium">{triage.primaryConstraint}</dd>
          </div>
        </dl>
      </Section>

      <Section>
        <Label>Summary</Label>
        <p className="mt-2 max-w-prose text-section">{triage.summary}</p>
      </Section>

      <Section>
        <Label>Constraints</Label>
        <ul className="mt-4 space-y-5">
          {triage.constraints.map((constraint) => (
            <li
              key={constraint.constraint}
              className={`border-l-2 pl-4 ${RISK_BORDER[constraint.riskLevel]}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium">{constraint.constraint}</h3>
                <RiskWord level={constraint.riskLevel} />
              </div>
              <p className="mt-1 max-w-prose text-muted">{constraint.rationale}</p>
              <p className="mt-2 max-w-prose">{constraint.mitigation}</p>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

function NotTriaged() {
  return (
    <Section>
      <Label>Analysis</Label>
      <p className="mt-2 max-w-prose">
        This request has not been scored. The submission is saved and nothing has been lost —
        only the triage is missing.
      </p>
    </Section>
  );
}

export default async function IntakeDetailPage({ params }: PageProps<'/intakes/[id]'>) {
  const { id } = await params;
  const intake = await getIntake(id);
  if (!intake) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-meta text-muted hover:text-accent">
        Back to all requests
      </Link>

      <article className="mt-4 rounded-sm bg-sheet ring-1 ring-rule">
        <header className="px-8 pt-8 pb-7">
          <h1 className="max-w-prose text-page font-semibold tracking-tight">{intake.title}</h1>
          <p className="mt-1 text-section">{intake.companyName}</p>
          <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-meta text-muted">
            <span>{intake.submitterName}</span>
            <a href={`mailto:${intake.contactEmail}`} className="hover:text-accent">
              {intake.contactEmail}
            </a>
            <span className="tabular">Received {received.format(intake.createdAt)}</span>
          </p>
        </header>

        {intake.triage ? <Analysis triage={intake.triage} /> : <NotTriaged />}

        <Section>
          <Label>As submitted</Label>
          <dl className="mt-3 grid gap-5 sm:grid-cols-3">
            <div>
              <dt className="text-meta text-muted">Industry</dt>
              <dd className="mt-0.5">{intake.industry}</dd>
            </div>
            <div>
              <dt className="text-meta text-muted">Budget</dt>
              <dd className="mt-0.5">{intake.budgetRange}</dd>
            </div>
            <div>
              <dt className="text-meta text-muted">Timeline</dt>
              <dd className="mt-0.5">{intake.timeline}</dd>
            </div>
          </dl>
          <p className="mt-6 max-w-prose whitespace-pre-wrap">{intake.description}</p>
        </Section>
      </article>
    </main>
  );
}
