# Decision Log

## Key assumptions

- **The cross-board join key is the masked deal name, not an account/company code.** `Deal name masked` (Work Orders) and `Deal Name` (Deals) share 52 of 58 distinct values (90% overlap); the two "code" fields (`Customer Name Code`, `Client Code`) have **zero** overlap. The join is many-to-many, not a foreign key — the same name (e.g. "Sakura") appears 9× in Deals and multiple times in Work Orders, so a match doesn't guarantee it's *this* deal's work order. The agent always states the match rate and flags ambiguous (non-unique) names rather than presenting a join as complete (`lib/ai/tools/join-deals-work-orders.ts`).
- **The source CSVs are not cleaned before import**, by design — the assignment requires the agent to demonstrably handle messy data, and pre-cleaning would remove the test cases (missing fields, artifacts) that the resilience requirements check for. Cleaning happens only at sync/query time (`lib/normalize/*`), never at the CSV→monday.com import step.
- **There is no literal "Energy" sector.** Real canonical sectors: `Mining, Renewables, Railways, Powerline, Construction, Manufacturing, Aviation, Security and Surveillance, DSP, Tender, Others`. `Renewables` is the closest analog to the assignment's sample question, but the agent never silently aliases "energy" → "Renewables" — that would be a fabricated assumption.
- **A duplicated-header artifact exists in the Deals CSV** — two rows are a pasted-in header row masquerading as data (e.g. a cell under `Deal Stage` literally containing `"Deal Stage"`). Detected and excluded (`isHeaderEchoRow`), with the exclusion count logged, both at import and at sync.
- **The real messiness here is missing data and structural artifacts, not format drift.** All 1,274 non-blank date values checked were already ISO `yyyy-MM-dd`; sector spellings already matched the canonical list exactly. The actual problems are high null rates (e.g. `Close Date (A)` 92% blank) and the join ambiguity above — worth being precise that this is what the dataset tested, versus what the normalization code is merely defensively built to handle.
- **monday.com is the system of record at query time, not the CSVs** — they're one-time seed data per the assignment's own instructions. The agent never rereads them; it syncs from monday.com's live API, per the "query monday.com dynamically" requirement.

## Trade-offs chosen and why

- **Sync-then-cache, not live-query-per-message.** Chat tools query a normalized Postgres cache (refreshed by `/api/sync`), not monday.com directly per turn — fast, deterministic, avoids rate-limiting a live conversation, and every answer states its `synced_at` freshness.
- **A `raw jsonb` column, not a fully-typed mirror of every field.** Work Orders has 38 source columns; only the BI-relevant subset is modeled as typed columns, the rest preserved verbatim in `raw` for audit — but deliberately **excluded from what tools return to the model** (see bugs below).
- **Resilient, two-tier item creation in the import script** — if a row's status/dropdown values fail, it retries with a text/number/date-only payload rather than failing the whole row.
- **Board/column IDs live in a committed `board-config.json`, not env vars** — ~50 columns across two boards, no secrets in the file, generated as one consistent unit.

## What happened running this live (bugs no code review would have caught)

- **Groq, not xAI's Grok.** The provided key was Groq's format (`gsk_...`), not xAI's (`xai-...`) — confirmed with the user and repointed at `api.groq.com/openai/v1` with `llama-3.3-70b-versatile`.
- **monday.com's complexity-budget rate limit hit mid-import**, and monday.com's own auto-created placeholder item on each new board tripped a naive "board already has items, skip" resume check — both fixed: retries now honor the API's actual `retry_in_seconds`, checkpoints persist after every mutation (not just at the end), and resume logic uses an explicit `itemsImported` flag instead of guessing from item count.
- **The chat route stopped after the first tool call with zero text** — `streamText` defaults to one step; fixed with `stopWhen: stepCountIs(5)`.
- **A native `Date` object in tool output broke the SDK's internal message validation** once multi-step was enabled (isolated via a minimal repro against a trivial tool, which worked fine). Traced to `syncedAt` — a real `Date` instance from Drizzle's `timestamp` type — surviving into every row. Fixed by trimming tool-facing results to exclude both `raw` and per-row `syncedAt` (also pure token waste).
- **The model tried to hand-sum 111 deal values and got it wrong by ~11x** (and separately mislabeled the currency as `$`). This is exactly the anti-pattern `doc/rule.md` warns against — aggregation must happen in SQL, not by the model summing raw rows. Fixed by adding SQL-computed `summary` objects (`count`, `totalValue`, `statusBreakdown`) to every query tool and instructing the model to use them exclusively; re-verified the model's answer now matches the SQL aggregate to the cent, in ₹.
- **An unfiltered query (344 rows) exceeded Groq's free-tier 12k-tokens/minute limit** (~23k tokens requested) and crashed the second model call outright. Fixed by capping rows returned to the model at 20 regardless of match count — but the cap had to live at the tool boundary (`lib/ai/tools/query-deals.ts`), not inside `queryDeals` itself, since `join-deals-work-orders.ts` calls `queryDeals` directly and needs the full set for its own match/ambiguity math. Re-verified the same query the model previously crashed on: 344 deals, ₹2,305,518,040.91 — exact match to `SELECT sum(value)`.

None of these six were visible in code review — all six surfaced only by running the representative questions from `doc/prd.md` §7 against the live, fully-populated boards.

## What I'd do differently with more time

- Verify monday.com's exact `status`/`dropdown` column-value JSON shapes against the live API rather than hedging with a fallback path.
- Larger normalization test corpus beyond the values inspected manually in Phase 0.
- Batch item creation via GraphQL aliasing instead of sequential calls.
- Scheduled sync (Vercel Cron) instead of a manual "sync now" button.

## How I interpreted "leadership updates"

A dedicated `generateLeadershipBrief` tool assembling a structured, grounded brief (pipeline-by-sector, work-order status, data-quality notes) from the same queries the agent already uses — not a slide generator or a separate free-text pass. All aggregation happens in SQL/TypeScript before the model sees it, so the brief can't drift into fabricated commentary; the model only frames already-computed numbers, per the same grounding rules as every other answer.
