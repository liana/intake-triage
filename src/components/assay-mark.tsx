// Four bars, one per constraint, always in SPEC.md §4 precedence order. Level is
// encoded by fill height as well as colour, so the mark survives greyscale and
// colour blindness — and a reader learns the shape faster than the labels.
import { CONSTRAINT_PRECEDENCE, type RiskLevel } from '@/lib/risk';
import type { ConstraintAssessment } from '@/lib/triage-schema';

const FILL_HEIGHT: Record<RiskLevel, string> = {
  Low: 'h-1/3',
  Medium: 'h-2/3',
  High: 'h-full',
};

const FILL_TONE: Record<RiskLevel, string> = {
  Low: 'bg-risk-low',
  Medium: 'bg-risk-medium',
  High: 'bg-risk-high',
};

export function AssayMark({ constraints }: { constraints: ConstraintAssessment[] }) {
  const label = CONSTRAINT_PRECEDENCE.map((name) => {
    const scored = constraints.find((c) => c.constraint === name);
    return `${name} ${scored ? scored.riskLevel : 'not scored'}`;
  }).join(', ');

  return (
    <span className="inline-flex h-4 items-end gap-[3px]" role="img" aria-label={label} title={label}>
      {CONSTRAINT_PRECEDENCE.map((name) => {
        const scored = constraints.find((c) => c.constraint === name);
        return (
          <span key={name} className="flex h-4 w-[5px] items-end bg-rule">
            {scored ? (
              <span className={`w-full ${FILL_HEIGHT[scored.riskLevel]} ${FILL_TONE[scored.riskLevel]}`} />
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

const RISK_TEXT: Record<RiskLevel, string> = {
  Low: 'text-risk-low',
  Medium: 'text-risk-medium',
  High: 'text-risk-high',
};

export function RiskWord({ level }: { level: RiskLevel }) {
  return <span className={`font-semibold ${RISK_TEXT[level]}`}>{level}</span>;
}
