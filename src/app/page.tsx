import Link from 'next/link';

import { AssayMark, RiskWord } from '@/components/assay-mark';
import { listIntakes, type IntakeListItem } from '@/lib/intakes';

// The list reads the database on every request. Without this Next prerenders it
// at build time and the page never shows anything submitted after the build.
export const dynamic = "force-dynamic";

const received = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

function NewRequestLink({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/intakes/new"
      className={`inline-block rounded-sm bg-accent px-4 py-2 text-body font-medium text-sheet hover:bg-accent-strong ${className}`}
    >
      New request
    </Link>
  );
}

function Empty() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <h2 className="text-title font-semibold">No requests yet</h2>
      <p className="mt-3 text-muted">
        Intake scores every inbound project request against four constraints — regulatory,
        data readiness, timeline, and budget — so it reaches you already triaged.
      </p>
      <NewRequestLink className="mt-8" />
    </div>
  );
}

function Row({ intake }: { intake: IntakeListItem }) {
  const { triage } = intake;
  const tag = (value: string | undefined) => value ?? <span className="text-rule">—</span>;

  return (
    <tr className="border-t border-rule align-top hover:bg-page/60">
      <td className="py-4 pl-6 pr-4">
        <Link href={`/intakes/${intake.id}`} className="font-medium text-ink hover:text-accent">
          {intake.title}
        </Link>
        <div className="text-meta text-muted">{intake.companyName}</div>
        <div className="mt-1 text-meta text-muted lg:hidden">
          {triage ? `${triage.technicalPattern} / ${triage.engagementShape}` : 'Not scored'}
        </div>
      </td>
      <td className="hidden py-4 pr-4 text-muted lg:table-cell">{tag(triage?.technicalPattern)}</td>
      <td className="hidden py-4 pr-4 text-muted lg:table-cell">{tag(triage?.engagementShape)}</td>
      <td className="hidden py-4 pr-4 text-muted lg:table-cell">{tag(triage?.primaryConstraint)}</td>
      <td className="py-4 pr-4 whitespace-nowrap">
        {triage ? (
          <span className="flex items-center gap-3">
            <AssayMark constraints={triage.constraints} />
            <RiskWord level={triage.overallRisk} />
          </span>
        ) : (
          <span className="text-meta text-muted">Not scored</span>
        )}
      </td>
      <td className="tabular py-4 pr-6 text-right text-meta whitespace-nowrap text-muted">
        {received.format(intake.createdAt)}
      </td>
    </tr>
  );
}

export default async function IntakeList() {
  const intakes = await listIntakes();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-page font-semibold tracking-tight">Intake</h1>
          <p className="text-muted">
            Inbound project requests, scored against four constraints at submission.
          </p>
        </div>
        <div className="flex items-baseline gap-5">
          <span className="tabular text-meta text-muted">
            {intakes.length} {intakes.length === 1 ? 'request' : 'requests'}
          </span>
          <NewRequestLink />
        </div>
      </header>

      <section className="mt-8 overflow-hidden rounded-sm bg-sheet ring-1 ring-rule">
        {intakes.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-meta text-muted">
                <th scope="col" className="py-3 pl-6 pr-4 font-medium">Request</th>
                <th scope="col" className="hidden py-3 pr-4 font-medium lg:table-cell">Pattern</th>
                <th scope="col" className="hidden py-3 pr-4 font-medium lg:table-cell">Shape</th>
                <th scope="col" className="hidden py-3 pr-4 font-medium lg:table-cell">Watch</th>
                <th scope="col" className="py-3 pr-4 font-medium">Assay</th>
                <th scope="col" className="py-3 pr-6 text-right font-medium">Received</th>
              </tr>
            </thead>
            <tbody>
              {intakes.map((intake) => (
                <Row key={intake.id} intake={intake} />
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
