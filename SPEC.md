# SPEC.md — Client Intake & Triage

Product requirements for the Tribe AI take-home, Exercise 3. *What* we're building. See `DECISIONS.md` for *why*, `CLAUDE.md` for *how*.

## 1. Executive Summary & Product Goal

The **Client Intake & Triage Application** is an internal tool for technical consulting teams to intake, analyze, and risk-evaluate inbound project requests. A submission is validated, analyzed by a single schema-constrained `claude-opus-5` call, and persisted together with its triage in one step. The call returns an executive summary, three canonical tags, and four risk-scored constraints with concrete mitigations.

The goal is that requests arrive **already categorized and risk-flagged** rather than sitting in an undifferentiated queue — triage happens at intake, not as downstream cleanup. Fixed vocabularies rather than free text keep intakes comparable, which is what makes the list filterable and output consistent across submissions.

## 2. Scope

**In:** create-intake form → triage → persist → list → detail. Loading, empty, and error states. Canonical vocabularies. Four-constraint risk assessment. Boundary validation. Seed and triage dev scripts.

**Out (see `DECISIONS.md`):** multi-agent pipeline, model tiering, observability and per-call triage logging, LLM-as-a-judge evals, automated tests, PII masking, auth, pagination, Docker.

## 3. Canonical vocabularies

**Submitter-selected (dropdowns):**

- **Industry** — Healthcare & Life Sciences · Fintech & Financial Services · E-Commerce & Retail · Enterprise SaaS · Industrial & Manufacturing · Public Sector & Education · Other
- **Budget** — Under $50k · $50k–$100k · $100k–$250k · $250k+ · Not yet determined
- **Timeline** — Under 4 weeks · 4–8 weeks · 2–6 months · 6+ months · Not yet determined

**AI-assigned (the brief's "three tags"):**

1. **Technical Pattern** — RAG & Knowledge Search · Fine-Tuning & Custom Models · Autonomous Agents & Workflows · Computer Vision & Multimodal · Predictive Analytics & Forecasting · Data Engineering & Pipelines · Legacy Migration & Integration · Other
2. **Engagement Shape** — Strategy & Roadmap · Discovery & Feasibility · Prototype / PoC · Production Build · Optimization & Scaling · Audit & Assessment · Team Augmentation · Other
3. **Primary Constraint** — the constraint carrying the highest risk level (§4). Ties break in the order the constraints are listed there. `None` when all four are Low.

Three facets rather than one flat list: the trio *routes* a request instead of describing it three times. `Other` is permitted in facets 1–2 but used only when nothing fits.

## 4. Constraints

Every intake is evaluated against four constraints — the things that limit how an engagement can be run. The model assigns each a risk level of **Low**, **Medium**, or **High** against the rubric below. They are listed in precedence order, which settles ties when two share the top level.

| Constraint | High | Medium | Low |
|---|---|---|---|
| **Regulatory & Security** | Regulated data (HIPAA/PCI/GDPR) requiring air-gapped or on-prem execution | Standard SOC 2 cloud with customer-managed keys | Internal tool, no PII exposure |
| **Technical & Data Readiness** | Data scattered or unstructured; no API access to source systems | Dependency on undocumented or unreleased third-party models/APIs | Standard retrieval over clean existing stores |
| **Timeline & Scope** | Production Build of a complex pattern (Autonomous Agents, Fine-Tuning) in under 4 weeks | Prototype/PoC under 4 weeks with no stated evaluation criteria | Discovery or Strategy with 4+ weeks |
| **Budget & Commercial** | Under $50k for a Production Build needing custom pipelines or compliance isolation | Budget undetermined paired with ambiguous scope | Budget proportionate to engagement shape |

**Risk level anchors:** **High** — likely to block delivery or require renegotiating scope or terms before work starts. **Medium** — manageable, but needs an explicit plan and a named owner before kickoff. **Low** — handled in the normal course of work.

**Overall risk:** any one High, or three or more Mediums → **High**. One or two Mediums → **Medium**. All Low → **Low**. Each level carries a recommended action.

All four constraints always return, each with a rationale and a mitigation naming a concrete first action — "assess data quality" is a restatement, not a mitigation. Risk thresholds are unvalidated placeholders and live in a single named constants block.

`overallRisk` must equal the rollup of the returned constraint risk levels.

## 5. Data model

```prisma
model Intake {
  id                String   @id @default(cuid())
  submitterName     String
  contactEmail      String
  companyName       String
  title             String
  description       String
  industry          String
  budgetRange       String
  timeline          String
  summary           String?
  technicalPattern  String?   // tag 1
  engagementShape   String?   // tag 2
  primaryConstraint String?   // tag 3
  overallRisk       String?
  constraints       String?   // [{constraint, riskLevel, rationale, mitigation}] × 4
  recommendedAction String?
  createdAt         DateTime @default(now())
}
```

The three tag columns are the brief's three tags; all three must be filterable from the list. AI columns are null when triage failed or was skipped.

## 6. Flow and API

```
[ Form ] → POST /api/intakes   (validate → triage → persist as one operation)
                        ▼
        GET /api/intakes → list      GET /api/intakes/[id] → detail
```

Triage is synchronous: the request completes only once the model has answered or failed, so a row never exists in a pending state.

## 7. AI behavior

**One call**, not a pipeline: a single deterministic transform with every step known in advance.

- **Model `claude-opus-5`, with no tools.** The risk call is the product; judgment quality matters more than cost here.
- **Structured output:** `summary`, `technicalPattern` (enum), `engagementShape` (enum), `primaryConstraint` (enum), `constraints` (4 × `{constraint, riskLevel, rationale, mitigation}`), `overallRisk`, `recommendedAction`.
- **Summary is 2–3 sentences**; exactly three tags; mitigations as bullets.
- **Submission completes fast enough that the wait feels reasonable** — triage is synchronous, so the submitter waits on it.
- **On failure** — including output that fails schema validation — the intake still persists, with its AI fields null. Triage never blocks submission. This is the product's required error path.

## 8. Security guarantees

**Primary control: capability limitation.** The model has no tools, no function calling, no network access, no code execution, and no database handle. A fully successful prompt injection yields a bad summary — injected instructions have nowhere to go. Everything below is defense in depth on top of that boundary.

1. **Server-side validation is authoritative** — types, required fields, trimming, and hard length caps (title ≤ 200, description ≤ 5000, other fields ≤ 120). Caps double as token-cost control.
2. **User text is treated as data, never as instructions** to the model.
3. **Output shape is schema-constrained** — injection can corrupt content, never shape or behavior.

No secret is ever exposed to the client. No raw SQL. No unescaped HTML rendering.

## 9. UI — three pages

**`/` — list.** Every intake as a row: title, company, three tags, risk indicator. **Empty state** explains the tool and links to the form. Rows open the detail.

**`/intakes/new` — create.** Text fields plus three dropdowns, one *Submit*. Submitting shows a **loading state** while triage runs, then lands on the new record's detail page.

**`/intakes/[id]` — detail.** Every submitted field, the summary, three tags, four constraints color-coded by risk level with rationale and mitigation, recommended action. When triage failed, an **error state** says so in place of the analysis and offers *Retry*.

Clarity over polish: the empty state tells you what to do next, the error says something useful.

## 10. Build gates & acceptance criteria

Work in order. Each gate ends in a demoable state and must be verified before moving on.

| # | Build | Verification |
|---|---|---|
| 1 | Schema, migration, seed script | Migration applies cleanly; seed inserts five fixtures; rows present in the database |
| 2 | Triage function, standalone | Script returns schema-valid JSON for a clean fixture *and* a high-risk one; output passes the quality questions below |
| 3 | List page + empty state | Page renders; empty state present with no data |
| 4 | Create form → persists | `POST /api/intakes` returns 201; row persisted; appears in the list |
| 5 | Detail page | Renders every submitted field, summary, three tags, four constraints |
| 6 | Triage wired into create | `POST /api/intakes` returns a persisted intake with triage populated |
| 7 | Error path | With an invalid key: intake still persists with null AI fields; detail page shows the error state and a working *Retry* |
| 8 | README + `DECISIONS.md` | `npm run build` typechecks; both documents complete |

Also verified: a description over the 5,000-character cap is rejected with a visible message; a description containing an injection attempt still produces schema-valid output; output that fails schema validation surfaces the error state rather than rendering.

**Gate 2 output check** — summary is 2–3 sentences and captures the project; tags are real picks rather than `Other`; risk levels match human judgment; mitigations are concrete first actions. Run a clean fixture *and* a risky one to confirm the model discriminates.

**Seed fixtures** — five (clean, high-risk, no budget, 5,000-character description, edge case), carrying canned triage output so seeding costs no API calls.

**Gates 1–2 are headless** so the structured-output binding is proven before any UI depends on it.

## 11. Scope under time pressure

The exercise budgets **2–3 hours**. Going over is permitted if disclosed. If the build runs long, shed scope in this order, explicitly rather than silently:

1. *Retry* on the detail page — the error state still explains itself
2. Per-constraint mitigation text — keep constraint, risk level, and rationale
3. Visual polish

**Never cut:** the brief's required fields, the three views, the AI feature, the three UX states.

## 12. Submission

Exercise logistics, not product requirements.

- **Loom** of the entire build, screen + audio, ending with a 10–20 minute wrap-up: product & UX, system overview, reliability & verification, tradeoffs & next steps.
- **`README.md`** — How to Run (including `prisma generate` and `migrate`, since `src/generated/prisma` is gitignored), What You Built, Verification.
- **`DECISIONS.md`** — plan, decisions, verification, tradeoffs, learnings, next steps.
- **Zip including `.git`**, named `Liana_Leahy_Tribe_IntakeTriage.zip`. The commit history is reviewed.
- **Total time spent**, with the Loom link.
