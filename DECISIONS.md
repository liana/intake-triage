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

**Code derives the rollup; the model judges only the four constraints.** `overallRisk`, `primaryConstraint`, and the action tier are computed from the four returned risk levels rather than asked for, taking the structured response from seven fields to five. `SPEC.md` §4 requires `overallRisk` to equal the rollup of the constraint levels; deriving it makes that true by construction instead of a property we would have to check on every response, and it removes two enum fields that injection or ordinary model error could set inconsistently with the scores beneath them. This does not contradict the decision above. The model still makes every judgment call — four risk levels weighed against the rubric — and code does only the arithmetic on top of them. What we gave up is a signal: a model that rolled up its own scores wrongly would have been telling us it had misread the rubric, and we can no longer see that.

**Recommended action is a hybrid.** The overall risk level maps to a fixed action tier, and the model writes the intake-specific next step beneath it. A pure lookup is reproducible and free but says the same three things forever. Pure model authorship reads better but makes routing depend on prose. Splitting them puts the reproducible half in the constants block and the judgment in the sentence, and keeps the tier honest when the sentence is weak. The tier needs no column — it is a function of `overallRisk`.

**Dropped `triageStatus` and `triageError` from the scaffold.** The initial Prisma schema — generated before the design was settled — carried `triageStatus` (`PENDING`/`COMPLETED`/`FAILED`) and `triageError`. Those columns presuppose a *background* design, where an intake is saved first and the AI runs afterward, so a row must record whether triage is pending, finished, or failed. That architecture was never actually chosen; the columns arrived ahead of the decision. This design runs triage *before* anything is persisted, so a row can never exist in a pending state, and failed triage simply leaves the AI columns null — which already communicates "no triage." Dropping them removed an unmade decision from the schema.

**Model choice: `claude-opus-5`.** The hard part of this task is risk assessment — weighing four constraints against a rubric is judgment, not extraction — and because the design chose model judgment over deterministic rules, that judgment carries the product. A wrong risk call is worse than no risk call, since it misleads. Summary and tagging alone would run fine on a cheaper tier; the risk reasoning is what justifies the top one. At one call per submission the cost difference is immaterial, and interactive latency is handled by lowering `effort` rather than downgrading the model. If volume grew, splitting summarization to a cheaper model while keeping risk on Opus would be the first tiering move.

**Effort `low`, measured rather than assumed.** Anthropic's guidance is a minimum of `high` for intelligence-sensitive work, and risk scoring against a rubric is exactly that, so this needed evidence. Ran fixtures 1, 2 and 5 at `medium` and `low`: total 38.0s to 34.4s, output tokens 2,694 to 2,475, categorical agreement identical at both (8/8, 7/8, 5/8), and mitigations 17% shorter on average without becoming vaguer — the shorter answers still name an owner and a first week. So `low` is both faster and cheaper here with no measured quality cost. Two caveats kept honest: one sample per cell, so the per-fixture deltas sit near run-to-run variance even though the aggregate direction is consistent; and agreement only scores the categorical fields, so the prose was judged by reading it, not by measurement. Effort is overridable with `TRIAGE_EFFORT` so the comparison can be re-run without a code edit.

**Sonnet 5 measured, and rejected.** With effort already at `low`, the remaining free lever was the model, so we measured rather than defended the prior. Across fixtures 1, 2 and 5: 34.4s to 25.3s (27% faster), and 60% cheaper at $2/$10 per MTok against $5/$25. Of 24 categorical fields, 22 were identical; the two that differed were both on the injection fixture, both defensible readings, and they offset — each model matched the canned guess on one. Rejected anyway, for two reasons. Sonnet returned five constraints on one run where the rubric defines four, and Opus never did; that is one observation, but it is the only evidence either way about which model holds this contract. And three fixtures is too thin to overturn a model choice on a task where, as above, a wrong risk call is worse than no risk call. The measurement stands as the evidence for the tiering move this document predicted, not as a reason to make it yet.

**`constraints` is pinned to exactly four in the schema, not checked after the fact.** It was a plain array with a runtime length check that threw once the model had already answered. Moving `.length(4)` into the Zod schema turns it into `minItems`/`maxItems` inside the structured-output contract, enforced at the API boundary for 23 extra input tokens. This was not theoretical tidying: it is what made Sonnet stop returning five constraints. A guarantee the API enforces beats a guard that fires after the money is spent.

**Streaming considered and rejected: the submitter is not the reader.** Triage takes about 12 seconds and the submitter waits on it, so streaming is the obvious fix and it would work. Measured on a live call: first byte at 815ms, and because the structured output arrives in schema order the summary is readable by ~3s, the tags land at 3.2s, and the four constraints arrive one at a time between 3s and 11s. Perceived time-to-first-content would fall from ~12s to ~1.3s. We are not building it, because the wait is mispriced as a problem. The person filling in the form is not the person who reads the triage: a prospective client files a request once and leaves, while a practice lead reads the analysis later, by which time it has long since finished. Twelve seconds of one-off cost buys the submitter something they never consume. If one person were doing both — an internal analyst pasting requests in and reading results back — this would be the first thing to fix, and the measurement above is the plan for doing it. There is a real implementation cost behind that judgement too: persisting only after triage succeeds means streaming to the browser requires either rendering partial JSON on the form page, which needs a tolerant parser for a half-finished object, or persisting untriaged first and streaming into the detail page, which would reverse the no-pending-state decision above.

**Risk thresholds are unvalidated placeholders.** Plausible, not calibrated, and isolated in one constants block. Calibration needs historical engagement outcomes we don't have.

**Security posture: capability limitation over input filtering.** Prompt injection cannot be reliably filtered — no regex or delimiter scheme closes it. The useful question is not "how do we detect malicious input" but "what could the model do if fully compromised?" Here: return bad text. No tools, no network, no code execution, no database handle. Validation, delimiter framing, and schema-constrained output are defense in depth on top of that boundary, not the boundary itself.

**PII masking deferred.** Considered narrow regex masking of SSN and card patterns. Cut for time, and because it's a privacy measure rather than a security control — the length caps and the no-tools boundary do the security work. Regex PII detection is best-effort and misses things; claiming "PII is scrubbed" would overclaim. Production would use a dedicated detection service.

**No per-call triage log.** Every submission persists, so "what are people submitting?" is answerable from the `Intake` table. What isn't recorded is anything about the call itself — model, token counts, latency — or *why* a triage failed, since null AI fields carry no reason. With more time, an append-only `TriageLog` capturing input, output, and call metadata for every attempt would cover failure diagnosis and basic observability. Out of scope for a 3-hour build.

**No automated tests.** In a 3-hour one-shot build, a test framework costs 30–45 minutes of setup (Vitest, jsdom, React Testing Library, a Prisma test-DB strategy, mocking the LLM) before the first useful assertion, and most gates are one-shot checks cheaper to perform than to automate. Replaced with two dev scripts — a seed script for fixtures and a standalone triage script for prompt iteration — plus a manual verification checklist in the README. Honest cost: the no-tools invariant and the risk rollup are unprotected against future change.

**Considered and rejected: preview before commit.** An earlier design ran triage first, showed the submitter a preview, let them revise and re-analyze, and persisted only on confirmation. It's a genuinely nicer idea — the submitter sees how the system read them before it's recorded.

It was cut for flow complexity. Supporting one failure mode required forking the primary path: with no triage to confirm, *Submit* would have meant something different from what it means on the happy path, so the failure state needed two buttons with two meanings. Three paragraphs of specification for one error case is a signal the design is wrong. The brief also describes the simpler order directly — "on intake creation, call an LLM" — and all three required UX states survive without the preview. What is genuinely lost: the human checkpoint on AI output before persistence — analysis is now recorded without anyone having read it first.

**Triage never blocks submission.** Filing a request is the core job; triage is additive on top of it. An LLM error, a timeout, or schema-invalid output leaves the intake persisted with null AI fields and an error state on the detail page offering *Retry*. The retry lives where the missing analysis is visible rather than as a fork in the submit flow. One consequence accepted knowingly: null AI fields can't distinguish "triage failed" from "triage never ran" — a distinction only operations cares about, and what the deferred `TriageLog` would cover.

**Tag filtering is post-Gate-8, not cut.** Filtering the list by the three tags is the most direct demonstration of why fixed vocabularies beat freeform, so dropping it outright would undercut the decision above. But it belongs to no build gate, and inventing one inside a 2–3 hour budget would push the required error path later. It is scheduled after Gate 8 and sits first in the §11 shed order, so if it goes, it goes explicitly. The vocabulary argument does not depend on it: consistent tags are what make the list comparable across submissions and what a routing or benchmarking layer would read, and none of that is visible in a filter control anyway.

## Tradeoffs / what we did not do

Multi-agent pipeline and model tiering · OTel instrumentation · per-call triage logging · triage preview before commit · LLM-as-a-judge evals · automated tests · PII masking · auth and multi-tenancy · pagination and search · Docker · relational tag tables · streaming and progressive rendering · model tiering to Sonnet.

## With one more day

Add the append-only `TriageLog` described above — it serves failure diagnosis and observability in one table, and would let us track the `Other` tag rate as a vocabulary-gap signal. Build an eval set and settle one-call-versus-decomposed with measurement rather than priors. Calibrate risk thresholds against historical engagements. Reinstate PII masking and a small test suite around the parsers and rollup. Split summarization to a cheaper model if volume justifies tiering.

Close the type gap at the storage boundary. Zod validates the *content* of the stored `constraints` JSON, so malformed JSON, an invalid risk level, and an unknown constraint name all degrade correctly to the "not scored" state. It does not cover the column's *type*: a BLOB where the schema says String is rejected by Prisma at the driver level, before `parseConstraints` ever runs, and the detail page returns a bare 500. Found by corrupting a row with raw SQL while verifying Gate 7. The application cannot produce it — Prisma only ever writes strings — so this is a robustness gap rather than a live bug, but "validate at the boundary" is doing less work than that phrase implies. Two fixes, both small: an `error.tsx` boundary, which the app currently has nowhere, so that any unexpected server throw renders something useful instead of a stack trace; and reading `constraints` through an explicit cast so a mistyped column degrades like every other unreadable value.

## What we learned

**The derivation earned its keep somewhere we did not expect.** Moving `overallRisk` and `primaryConstraint` out of the model's output was argued on consistency grounds — the rollup becomes true by construction. It turned out to be a security property: the injection fixture demanded every risk be set to Low, and the model could not have complied even if it had wanted to, because those fields no longer exist in its response. It scored four Mediums and code made it High.

**A constraint in the schema beats a check after the answer.** "Exactly four constraints" lived in a runtime guard that threw once the model had already responded. Moving it into the Zod schema made it `minItems`/`maxItems` inside the structured-output contract — and that, not the prompt wording, is what stopped a model returning five.

**The answer key caught our errors more often than the model's.** The canned fixtures were written as a baseline to judge the model against. In practice they found a fixture with constraints in the wrong order, and on at least two risk levels the model's judgement was better calibrated than the hand-written guess it was being scored against.

**Latency was a product question wearing an engineering costume.** We measured effort, a cheaper model, and streaming, and the honest answer came from none of them: the person who waits twelve seconds is not the person who reads the result. The right fix was to decide the wait did not matter, and say why.

**A 10% improvement is invisible.** Dropping effort from medium to low was real, free, and measurable — and could not be felt at all in the UI. Worth taking; not worth reporting as a fix.

**`npm run dev` is not a verification environment.** The static-prerender bug, and both Turbopack warnings, only exist in the build output.

## How we verified

**No automated tests, by the decision above — so verification was gate-by-gate and deliberate.** Two dev scripts did the repeatable work: `npm run seed` loads five fixtures with canned triage, and `npm run triage -- <n>` runs any fixture through the real call and diffs the categorical fields against that canned answer key. Everything else was a one-shot check, run rather than described.

**Gate 1.** Reset the database to zero, re-applied the migration, re-seeded, then read the rows back out with `sqlite3` — deliberately not through Prisma, so the check did not share a code path with the writer — and validated every canned payload against the §3 vocabularies and the §4 rollup.

**Gate 2.** Four fixtures through the live API. Confirmed the model discriminates: the clean fixture scored all Low, the healthcare pile-up all High-and-Medium.

**Gate 3.** Asserted the rendered HTML, cleared the table to see the empty state, and confirmed every custom Tailwind utility and the Archivo `@font-face` blocks were actually in the generated stylesheet rather than assuming the theme compiled.

**Gate 4.** Proved every rejection with `curl` before the form existed: 201 and the row persisted; 400 with "Keep the description under 5,000 characters"; 400 with per-field messages for a bad email, a blank title and an invalid enum; 400 rather than a crash on a malformed body. The client and server share one Zod schema, so testing through the form would have proved only that the client works.

**Gate 5.** Asserted the detail page against values read out of the database rather than hardcoded expectations — the first version of that check failed on a string typed from memory, not on a defect.

**Gate 6.** A real submission end to end: 201 in 16s, AI columns present in SQLite, the analysis on the page, the row in the list.

**Gate 7.** Ran the app with a deliberately invalid API key and submitted: 401 caught, 201 returned, intake persisted untriaged. Corrupted stored output three ways — malformed JSON, an out-of-vocabulary risk level, an unknown constraint name — and confirmed each degrades to the error state instead of rendering. Sent the injection fixture through the real `POST`. Made the database read-only to prove a failed *write* is distinguishable from a failed *triage*.

**What the checks caught that reading the code would not.** A list page silently prerendered as static, which would have frozen it at build time and which `npm run dev` never reveals. A seed fixture with its constraints out of precedence order. A type-level gap where a BLOB in a TEXT column bypasses the Zod boundary entirely. And Sonnet 5 returning five constraints where the rubric defines four.

**What is not covered.** Nothing is protected against regression: the no-tools invariant, the risk rollup and the parsers would all break silently under future change. Prose quality — whether a mitigation is a real first action — was judged by reading it. Latency figures are single samples, so the per-fixture deltas sit near run-to-run variance.
