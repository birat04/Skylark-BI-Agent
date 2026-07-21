# Skylark BI Agent

A conversational agent that answers founder-level BI questions ("how's our energy sector pipeline this quarter?") by reading live data from two monday.com boards — Work Orders and Deals — reconciling their inconsistencies, and returning grounded, caveated answers.

Full product/architecture docs live in [`doc/`](doc/): [`prd.md`](doc/prd.md), [`architecture.md`](doc/architecture.md), [`rule.md`](doc/rule.md), [`phase.md`](doc/phase.md), [`design.md`](doc/design.md), [`decision-log.md`](doc/decision-log.md).

## Architecture overview

```
CSV files (data/)
   │  one-time, write-scoped
   ▼
scripts/import-to-monday.ts  →  monday.com boards (Work Orders, Deals)
                                        │  read-only, ongoing
                                        ▼
                                 /api/sync  →  Postgres cache (Drizzle)
                                        │
                                        ▼
                                 /api/chat  →  Groq LLM + tool-calling
                                        │        (queryDeals, queryWorkOrders,
                                        │         joinDealsToWorkOrders,
                                        │         getDataQualityReport,
                                        │         generateLeadershipBrief)
                                        ▼
                                 Chat UI (Next.js App Router + shadcn/ui)
```

**Key decision:** the agent never queries monday.com live mid-conversation. A sync job (`/api/sync`) pulls both boards, normalizes them (`lib/normalize/`), and upserts into Postgres with a `synced_at` timestamp. Chat tools query Postgres, not monday.com directly — fast, deterministic, and every answer states its data freshness. See [`doc/architecture.md`](doc/architecture.md) for the full rationale and [`doc/decision-log.md`](doc/decision-log.md) for what this traded off.

Tech stack: Next.js (App Router) + TypeScript, shadcn/ui, Groq (Llama 3.3 70B) via the Vercel AI SDK, Postgres (Neon) via Drizzle ORM, monday.com GraphQL API via `graphql-request`.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure monday.com

The two source CSVs are seed data only — the app never reads them at runtime, per the assignment's requirement to query monday.com dynamically (see `doc/decision-log.md`). They get imported into monday.com **once**, via a script, not the CSV importer UI, so that column types and structure are set up deliberately (see `doc/decision-log.md` for the column-type choices and why).

1. Generate a monday.com API token (Admin → API). It needs **write** access for this one-time step.
2. Copy `.env.example` to `.env` and set `MONDAY_API_TOKEN`.
3. Run the import:
   ```bash
   npm run import:monday
   ```
   This creates two boards ("Work Orders", "Deals") in your monday.com workspace, provisions all columns with appropriate types (status, dropdown, date, numbers, text), and loads every row from `data/*.csv` — except rows detected as a duplicated-header artifact found in the source data (logged, not silently dropped). It writes the resulting board/column IDs to `lib/monday/board-config.json` (no secrets, safe to commit).
   - The script is **resumable**: if it's interrupted (e.g. monday.com's complexity-budget rate limit), rerunning it picks up from `board-config.json` instead of creating duplicate boards.
   - For ongoing use, you can swap in a read-scoped token afterward — only this one-time script needs write access.

### 3. Configure Postgres

1. Create a free [Neon](https://neon.tech) project (or any Postgres instance).
2. Set `DATABASE_URL` in `.env`.
3. Apply the schema:
   ```bash
   npx drizzle-kit migrate
   ```

### 4. Configure Groq

1. Get an API key from [console.groq.com](https://console.groq.com).
2. Set `GROQ_API_KEY` in `.env`.

### 5. Run

```bash
npm run dev
```

Open the app, click "Sync now" in the sidebar to pull monday.com data into Postgres, then ask a question.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run import:monday` | One-time: provision monday.com boards from `data/*.csv` (needs write-scoped `MONDAY_API_TOKEN`) |
| `npx drizzle-kit generate` | Generate a migration from `lib/db/schema.ts` (no DB connection needed) |
| `npx drizzle-kit migrate` | Apply migrations to `DATABASE_URL` |
| `npm test` | Run the normalization unit tests (`lib/normalize/*.test.ts`) |

## Project structure

See [`doc/architecture.md`](doc/architecture.md) §4 for the full annotated folder structure. Highlights:

- `lib/monday/` — GraphQL client, board sync, board-config loader
- `lib/normalize/` — date/sector/text normalization, header-echo-row detection
- `lib/db/` — Drizzle schema and query helpers (the Postgres cache)
- `lib/ai/` — Groq provider, system prompt (grounding rules), tool definitions
- `app/api/{chat,sync,health}/` — the three API routes
- `components/chat/`, `components/layout/` — the chat UI
- `scripts/import-to-monday.ts` — the one-time CSV → monday.com provisioning script

## Notes on data quality

The source CSVs are **not cleaned** before import — intentionally. See [`doc/decision-log.md`](doc/decision-log.md) for why, and for the real data-quality findings from this specific dataset (missing-field rates, a duplicated-header artifact, the actual cross-board join key, and the real sector taxonomy).
# Skylark-BI-Agent
