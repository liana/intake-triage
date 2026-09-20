# Intake

Internal tool for triaging inbound project requests. Every request is scored against four
constraints — regulatory, data readiness, timeline, budget — at the moment it is submitted, so
it reaches a practice lead already categorised and risk-flagged instead of sitting in an
undifferentiated queue.

`SPEC.md` is the product specification. `DECISIONS.md` covers what was decided and why, what was
deliberately left out, and how it was verified.

## How to run

**Prerequisites** — Node 22 (built and tested on v22.14.0) and npm. No database server: SQLite
lives in a file.

```bash
npm install
npx prisma generate          # required — see note below
npx prisma migrate deploy
npm run seed                 # optional: 5 fixtures, costs no API calls
npm run dev
```

Then open **http://localhost:3000**.

**`npx prisma generate` is not optional.** Prisma Client is generated to `src/generated/prisma`,
which is gitignored, and there is no `postinstall` hook. Skip it and the app installs and
typechecks but fails at runtime.

**Environment.** One variable, in `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

There is no `.env.example`, and `.env` is not needed — the SQLite path is hardcoded in
`prisma/schema.prisma` and `DATABASE_URL` is unused. Verified on a clean clone with no env files
at all.

**Without a key the app still runs.** Submissions persist with their AI fields null and the
detail page says "Not scored". That is the designed error path, not a broken install — see
Verification.

**Dev scripts**

```bash
npm run seed              # reset to the five fixtures
npm run triage -- 2       # run fixture 2 through the real model, diff against its canned triage
npm run triage -- 1 2 5   # several, in order
```

`TRIAGE_MODEL` and `TRIAGE_EFFORT` override the defaults (`claude-opus-5`, `low`) without a code
edit.

## What we built

- Requests arrive **already triaged** — one LLM call at submission returns a summary, two routing
  tags, and four risk-scored constraints with concrete mitigations.
- **Fixed vocabularies, not freeform tags.** `LLM` / `llms` / `GenAI` as three tags for one idea
  makes a list unfilterable; constrained enums keep requests comparable.
- **Triage never blocks filing.** A model error, a timeout, or schema-invalid output leaves the
  request saved, and says so.

**Flow** — `/intakes/new` → `POST /api/intakes` (validate → triage → persist) → `/intakes/[id]`,
with `/` as the queue.

**AI behaviour.** One `claude-opus-5` call, no tools, schema-constrained output. The model returns
five fields; `overallRisk`, the primary-constraint tag, and the recommended-action tier are
**derived in code** from the four returned risk levels, so the rollup is correct by construction
and a prompt injection cannot force a verdict.

**UX states.** *Loading* — the submit button and helper text during the roughly 11-second scoring
wait. *Empty* — the list explains the tool and links to the form. *Error* — a "Not scored" notice
in place of the analysis, plus a form-level banner when the save itself fails.

## Verification

No automated tests — a deliberate tradeoff, reasoned in `DECISIONS.md`. Replaced by two dev
scripts and this checklist.

| # | Check | Expected |
|---|---|---|
| 1 | `npm run seed` | five rows, mixed Low/Medium/High |
| 2 | Open `/` | rows with tags, four-bar assay mark, risk word |
| 3 | Delete all rows, reload `/` | empty state with a link to the form |
| 4 | Submit a request | ~11s wait, then its detail page with summary, three tags, four constraints |
| 5 | Paste 5,001 characters into the description | rejected with a visible message |
| 6 | `curl -X POST /api/intakes` with a bad email | 400 with a per-field message |
| 7 | `npm run triage -- 5` | injection fixture scores **High**, not the Low it demands; no prompt or key leaks |
| 8 | Set an invalid key, submit | 201, request saved, detail page shows "Not scored" |
| 9 | `npm run build` | compiles; `/`, `/api/intakes`, `/intakes/[id]` are dynamic (`ƒ`) |

Checks 1–4 and 9 were run against a clean clone while writing this.
