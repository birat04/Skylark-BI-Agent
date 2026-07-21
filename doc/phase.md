# Phase.md — Delivery Sequencing

Each phase has a single owner outcome and an exit criterion. No phase starts before the previous one's exit criterion is met — this is a solo/small-team build, sequencing beats parallelizing.

## Phase 0 — Foundations & monday.com provisioning
**Goal:** boards exist, project skeleton exists, nothing is hardcoded from day one.
- Import both CSVs into monday.com as two boards (Work Orders, Deals); define column types deliberately (status as a status column, dates as date columns, sector as a text/dropdown — decide and document in `decision-log.md`).
- Generate a read-only-scoped monday.com API token.
- Scaffold Next.js + TypeScript + Tailwind + shadcn; set up Drizzle + Neon Postgres; set up env vars.
- Confirm a raw GraphQL call against both boards returns data (throwaway script, not app code).
**Exit criteria:** boards live on monday.com with real column types; a script proves API read access; repo builds and deploys an empty shell to Vercel.

## Phase 1 — Data layer & sync
**Goal:** monday.com data reliably lands in Postgres, normalized, with quality flags.
- Implement `lib/monday/client.ts`, `queries.ts`, Zod schemas for raw rows.
- Implement `lib/normalize/{dates,sectors,text}.ts` with unit tests covering the actual messy values seen in the source CSVs (not hypothetical ones).
- Implement `/api/sync` route: pull → validate → normalize → upsert into `work_orders`/`deals` → write a `sync_runs` row.
- Build a minimal internal view (or just log output) to eyeball normalized vs. raw values side by side.
**Exit criteria:** running sync populates Postgres with both boards; every row has a `synced_at`; malformed rows are logged and excluded, not silently dropped or crashing the job.

## Phase 2 — Agent core (tool-calling, no UI polish)
**Goal:** a working Q&A loop, provable via API calls or a bare-bones page — correctness before polish.
- Wire Grok via AI SDK's OpenAI-compatible provider.
- Implement the core tools: `queryDeals`, `queryWorkOrders`, `joinDealsToWorkOrders`, `getDataQualityReport`.
- Write and test the system prompt against the guardrails in `rule.md` (grounding, caveat surfacing, freshness disclosure).
- Validate against the five representative user stories in `prd.md` §7.
**Exit criteria:** the five representative questions return correct, caveated, freshness-stamped answers via `/api/chat`, tested directly (curl/Postman), before any UI investment.

## Phase 3 — Conversational UI
**Goal:** the hosted, testable product surface.
- Build the chat UI (`components/chat/*`) using shadcn + AI SDK's `useChat`, streaming responses.
- Build `caveat-banner.tsx` as a distinct visual treatment for data-quality callouts (not buried inline text).
- Build sidebar with sync status/last-synced-at and a manual "sync now" trigger.
- Apply the visual identity from `design.md`.
**Exit criteria:** a non-technical user can open the link and complete the five representative queries with no instructions beyond the chat box itself.

## Phase 4 — Cross-board depth & clarifying questions
**Goal:** the agent handles the *hard* founder questions, not just the easy per-board ones.
- Harden the account-name join (fuzzy matching, match-rate reporting).
- Implement the clarify-trigger logic (ambiguous date ranges, unmatched sector names) per `rule.md` §4.4.
- Add adversarial test queries (deliberately ambiguous, deliberately data-sparse) and confirm graceful behavior.
**Exit criteria:** at least 3 deliberately messy/ambiguous test queries produce either a correct caveated answer or one well-targeted clarifying question — never a fabricated confident answer.

## Phase 5 — Leadership brief
**Goal:** deliver the optional "prepare for leadership updates" interpretation end-to-end.
- Implement `generateLeadershipBrief` tool: pipeline summary, ops status, risks/callouts, data-quality footnotes.
- Render as a distinct `leadership-brief-card.tsx` with copy/export affordance (markdown copy is sufficient; PDF export is a stretch, not required).
**Exit criteria:** asking "prepare this for our leadership update" produces a structured, accurate, copy-pasteable brief grounded in the same tool outputs used elsewhere.

## Phase 6 — Hardening, deploy, documentation
**Goal:** the actual deliverables — hosted link, decision log, source zip.
- Error-path pass: kill the DB connection, kill the Grok key, kill monday.com auth — confirm each fails the way `rule.md` §3 specifies (no stack traces, no fabricated fallbacks).
- Write `decision-log.md` (assumptions, trade-offs, what's next, leadership-update interpretation).
- Write `README.md` (architecture overview, monday.com setup steps, env vars, local run instructions).
- Final deploy to Vercel, smoke-test the five representative queries on the live hosted link.
**Exit criteria:** cold-open the hosted link with zero local setup and successfully run all five representative queries plus one leadership-brief request.

## Explicitly deferred (documented in decision-log.md, not built)
- Multi-user auth.
- Write access / board mutation.
- Real-time webhooks from monday.com (polling/manual sync is sufficient for this scope).
- PDF/slide export of the leadership brief (markdown export is sufficient for V1).
