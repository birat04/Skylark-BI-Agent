# Rule.md — Engineering & AI Guardrails

Non-negotiable conventions for anyone (human or agent) writing code in this repo. When in doubt, prefer the boring option.

## 1. Libraries — use these

| Need | Use | Do not use |
|---|---|---|
| LLM tool-calling loop | Vercel AI SDK (`ai`, `@ai-sdk/openai` pointed at xAI's baseURL) | LangChain, LlamaIndex, custom function-calling loop |
| DB access | Drizzle ORM | Prisma (heavier client, less SQL-transparent for this scope), raw `pg` without a query builder |
| Validation | Zod | Manual `if (!x)` chains for shape validation, `io-ts`, `yup` |
| Monday.com calls | `graphql-request` | `monday-sdk-js` (built for monday.com *apps*/iframe context, not a server-side read client), raw `fetch` without a typed wrapper |
| Dates | `date-fns` | `moment` (unmaintained), hand-rolled regex date parsing beyond what normalization explicitly requires |
| UI components | shadcn/ui primitives, composed | A second component library layered on top (Chakra, MUI) — pick one design system |
| State (chat) | React state + AI SDK's `useChat` | Redux/Zustand for chat state — unnecessary for this scope |
| Charts | Recharts | Chart.js, D3 directly (Recharts wraps it and fits shadcn styling) |

## 2. What to avoid outright
- **No hardcoded CSV/board data anywhere in source** — this is a hard assignment requirement. If a fixture is needed for local dev, it must live in `__fixtures__/` clearly labeled as test-only and never imported by production code paths.
- **No `any`** in TypeScript. If a monday.com API shape is genuinely unknown, model it as `unknown` and narrow via a Zod parse, don't cast.
- **No client-side secrets.** `MONDAY_API_TOKEN` and `GROQ_API_KEY` are read only in server-side route handlers / server components, never in a `"use client"` file, never in `NEXT_PUBLIC_*`.
- **No silent catch blocks.** Every `catch` either recovers meaningfully (with a logged reason) or re-throws with context. Never `catch (e) {}`.
- **No premature abstraction.** Two similar tool implementations don't need a shared factory until a third one shows up. Don't build a generic "board query engine" — build `queryDeals` and `queryWorkOrders` concretely; extract only if a real third case demands it.
- **No writes to monday.com.** The integration is read-only by spec. Do not implement or expose any mutation GraphQL calls, even behind a flag.

## 3. Error handling boundaries

| Failure | Handling |
|---|---|
| monday.com API unreachable / auth failure during sync | Sync job fails loudly, logs to `sync_runs.errors`, UI shows "last successful sync: X" — never silently serve stale data as if fresh |
| A board row fails Zod validation | Row is excluded from aggregates, logged, and counted in the sync summary ("3 rows skipped: missing required field") — never dropped invisibly |
| LLM tool call throws | Tool returns a structured error object to the model (`{ error: "..." }`), the model is instructed (system prompt) to surface this to the user plainly, not to guess a substitute answer |
| Groq API error/timeout | Route handler returns a user-facing "the assistant is temporarily unavailable, please retry" — never a stack trace, never a fabricated fallback answer |
| Ambiguous query | Model asks one clarifying question (see §4) rather than silently picking an interpretation |

## 4. AI-specific guardrails (system prompt contract)

These are enforced in `lib/ai/system-prompt.ts` and must hold for every response:

1. **Grounding only.** The model may only state numbers that came from a tool result in the current turn. It must not compute, estimate, or recall a number from outside the tool output.
2. **Mandatory caveat surfacing.** If a tool result's `caveats[]` array is non-empty, the response must reference it, not omit it for brevity.
3. **Freshness disclosure.** Every data-bearing answer states the `synced_at` timestamp from the tool result ("as of the last sync at ...").
4. **Clarify-trigger, not clarify-always.** Ask a clarifying question only when the ambiguity would change the numeric answer (e.g., undefined fiscal quarter boundary, a sector name with no fuzzy match). Do not ask clarifying questions for stylistic or trivially-resolvable phrasing.
5. **No fabricated confidence.** If a joined query (e.g., deals↔work orders by account name) has a poor match rate, the model states the match rate, not just the joined result.
6. **Scope refusal.** If asked to write to monday.com, or to answer using data outside the two boards, the model states the boundary plainly rather than attempting a workaround.
7. **Leadership brief tool only synthesizes from already-fetched, already-validated data** — it does not have separate license to generalize or add commentary not traceable to a query result.

## 5. Code style
- TypeScript strict mode on, no exceptions.
- File naming: kebab-case for files, PascalCase for components/types, camelCase for functions/variables.
- No comments unless documenting a non-obvious *why* (a monday.com quirk, a normalization edge case, a rate-limit workaround). Never comment what the code already says.
- Every tool function and every `lib/normalize/*` function gets a colocated unit test — these are the two places bugs are expensive (wrong numbers, silently wrong joins).
- Prefer server components / server-only data fetching by default; mark `"use client"` only where interactivity requires it (chat input, streaming render).

## 6. Security boundaries
- monday.com API token: read-only scope if monday.com's token scopes allow restricting it; stored as a Vercel encrypted env var.
- No PII beyond what's already in the two boards (names, account names) — do not enrich with external lookups.
- Rate-limit the `/api/sync` route: max `MONDAY_SYNC_RATE_LIMIT` (default 100) triggers per rolling 24h, checked against the `sync_runs` table (not in-memory, so it holds across serverless instances) — see `checkSyncRateLimit()` in `lib/monday/sync.ts`.
- Data-staleness disclosure: if the last sync is older than `MONDAY_DATA_STALE_AFTER_DAYS` (default 3), every tool result carries an explicit staleness caveat rather than just a timestamp the user has to interpret themselves (`lib/monday/freshness.ts`).
