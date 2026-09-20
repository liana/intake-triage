# DECISIONS.md — Client Intake & Triage

## Plan

- Ship a thin end-to-end slice: intake form → triage → persist → list → detail.
- Constrain AI output with canonical vocabularies so tags and risk are aggregatable, not decorative.
- Make the error path real: triage failure degrades gracefully and the submitter can still file.
- Keep the AI surface deliberately capability-free; validate at the boundary.

## Process note

The specification and these decisions were developed in a planning session with Claude before the recorded build began. The build itself is recorded end to end, and the walkthrough covers how the plan was reached.

## Key decisions

**Scoped down from an enterprise spec to a thin slice.** An earlier draft specified a parallel multi-agent pipeline, OTel tracing, a circuit breaker, and LLM-as-a-judge evals — roughly 20+ hours. Shipping 40% of that demonstrates worse prioritization than shipping 100% of something modest. Cut scope is captured under "with more time" rather than half-built.

**One LLM call, not three agents.** A single deterministic transform with every step known in advance — no exploration, no tool selection. Three parallel calls would triple input tokens (each needs the full description), triple the failure surface, and add aggregation, for no quality gain at this size. *Caveat: one call doing four things can produce shallower work than four focused calls. Settling that properly requires an eval comparing them; we didn't build one, so this is a prior, not a measurement.*

**Canonical tag vocabulary instead of freeform.** The brief asks for three tags and says freeform is fine. Freeform tags drift — `LLM`, `llms`, `GenAI`, `Generative AI` become four tags for one concept and filtering dies. In this build, fixed vocabularies keep the list filterable and the model's output consistent across submissions. The longer-term payoff is larger: consistent tags are what let a consultancy route a request to the right practice lead, pull cost and duration benchmarks from comparable past engagements, and flag engagements needing senior staffing or specific contract terms. None of that is built here, but none of it is possible without the vocabulary.

Three orthogonal facets rather than one flat list, so the trio routes a request instead of describing one dimension three times.

**Industry, budget, and timeline as dropdowns.** `"flexible, maybe 40-60k?"` can't be compared or filtered. Constrained input also makes AI output more consistent.

**Constraints, not "risk vectors."** The four things being scored — regulatory, data readiness, timeline, budget — are *constraints* on how an engagement can be run, and risk is a property of each. Naming them constraints and attaching a risk level reads more plainly than the reverse, and it makes the Primary Constraint tag a direct consequence rather than a derivation that needs explaining.

**Primary Constraint is derived, not judged separately.** It's the constraint with the highest risk level, at whatever level that is — so a project with nothing above Medium still surfaces the thing to watch. Ties break by a fixed precedence: Regulatory & Security, then Technical & Data Readiness, then Timeline & Scope, then Budget & Commercial. That order reflects how hard each is to unwind — compliance problems can't be engineered around quickly, data readiness is the classic silent killer, timelines are renegotiable, and budget is the most negotiable of the four. Deriving rather than asking keeps the model from producing a tag that contradicts its own constraint scores.

**The model assigns all four risk levels; code does not score risk.** Timeline-vs-scope and budget-vs-scope are computable, and rules would be reproducible and free. We chose model judgment anyway: rigid rules score each constraint in isolation and would flag "under $50k + Production Build = High" even when the description says the client has an internal team and only needs architecture guidance. **The trade is reproducibility for holistic judgment** — the same submission may not score identically twice. Mitigated by supplying the rubric and risk-level anchors in the prompt.

**Dropped `triageStatus` and `triageError` from the scaffold.** The initial Prisma schema — generated before the design was settled — carried `triageStatus` (`PENDING`/`COMPLETED`/`FAILED`) and `triageError`. Those columns presuppose a *background* design, where an intake is saved first and the AI runs afterward, so a row must record whether triage is pending, finished, or failed. That architecture was never actually chosen; the columns arrived ahead of the decision. This design runs triage *before* anything is persisted, so a row can never exist in a pending state, and failed triage simply leaves the AI columns null — which already communicates "no triage." Dropping them removed an unmade decision from the schema.

**Model choice: `claude-opus-5`.** The hard part of this task is risk assessment — weighing four constraints against a rubric is judgment, not extraction — and because the design chose model judgment over deterministic rules, that judgment carries the product. A wrong risk call is worse than no risk call, since it misleads. Summary and tagging alone would run fine on a cheaper tier; the risk reasoning is what justifies the top one. At one call per submission the cost difference is immaterial, and interactive latency is handled by lowering `effort` rather than downgrading the model. If volume grew, splitting summarization to a cheaper model while keeping risk on Opus would be the first tiering move.

**Risk thresholds are unvalidated placeholders.** Plausible, not calibrated, and isolated in one constants block. Calibration needs historical engagement outcomes we don't have.

**Security posture: capability limitation over input filtering.** Prompt injection cannot be reliably filtered — no regex or delimiter scheme closes it. The useful question is not "how do we detect malicious input" but "what could the model do if fully compromised?" Here: return bad text. No tools, no network, no code execution, no database handle. Validation, delimiter framing, and schema-constrained output are defense in depth on top of that boundary, not the boundary itself.

**PII masking deferred.** Considered narrow regex masking of SSN and card patterns. Cut for time, and because it's a privacy measure rather than a security control — the length caps and the no-tools boundary do the security work. Regex PII detection is best-effort and misses things; claiming "PII is scrubbed" would overclaim. Production would use a dedicated detection service.

**No per-call triage log.** Every submission persists, so "what are people submitting?" is answerable from the `Intake` table. What isn't recorded is anything about the call itself — model, token counts, latency — or *why* a triage failed, since null AI fields carry no reason. With more time, an append-only `TriageLog` capturing input, output, and call metadata for every attempt would cover failure diagnosis and basic observability. Out of scope for a 3-hour build.

**No automated tests.** In a 3-hour one-shot build, a test framework costs 30–45 minutes of setup (Vitest, jsdom, React Testing Library, a Prisma test-DB strategy, mocking the LLM) before the first useful assertion, and most gates are one-shot checks cheaper to perform than to automate. Replaced with two dev scripts — a seed script for fixtures and a standalone triage script for prompt iteration — plus a manual verification checklist in the README. Honest cost: the no-tools invariant and the risk rollup are unprotected against future change.

**Considered and rejected: preview before commit.** An earlier design ran triage first, showed the submitter a preview, let them revise and re-analyze, and persisted only on confirmation. It's a genuinely nicer idea — the submitter sees how the system read them before it's recorded.

It was cut for flow complexity. Supporting one failure mode required forking the primary path: with no triage to confirm, *Submit* would have meant something different from what it means on the happy path, so the failure state needed two buttons with two meanings. Three paragraphs of specification for one error case is a signal the design is wrong. The brief also describes the simpler order directly — "on intake creation, call an LLM" — and all three required UX states survive without the preview. What is genuinely lost: the human checkpoint on AI output before persistence — analysis is now recorded without anyone having read it first.

**Triage never blocks submission.** Filing a request is the core job; triage is additive on top of it. An LLM error, a timeout, or schema-invalid output leaves the intake persisted with null AI fields and an error state on the detail page offering *Retry*. The retry lives where the missing analysis is visible rather than as a fork in the submit flow. One consequence accepted knowingly: null AI fields can't distinguish "triage failed" from "triage never ran" — a distinction only operations cares about, and what the deferred `TriageLog` would cover.

## Tradeoffs / what we did not do

Multi-agent pipeline and model tiering · OTel instrumentation · per-call triage logging · triage preview before commit · LLM-as-a-judge evals · automated tests · PII masking · auth and multi-tenancy · pagination and search · Docker · relational tag tables.

## With one more day

Add the append-only `TriageLog` described above — it serves failure diagnosis and observability in one table, and would let us track the `Other` tag rate as a vocabulary-gap signal. Build an eval set and settle one-call-versus-decomposed with measurement rather than priors. Calibrate risk thresholds against historical engagements. Reinstate PII masking and a small test suite around the parsers and rollup. Split summarization to a cheaper model if volume justifies tiering.

## What we learned

*(fill in during the build)*

## How we verified

*(fill in during the build)*
