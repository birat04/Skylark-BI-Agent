# PRD — Monday.com Business Intelligence Agent

## 1. One-line summary
A conversational agent that answers founder-level business questions by reading live data from two monday.com boards (Work Orders, Deals), reconciling their inconsistencies, and returning grounded, caveated answers — not a dashboard, a colleague who already read the boards.

## 2. Problem
Founders ask questions like "how's pipeline looking for energy this quarter?" The answer lives across two boards with different owners, inconsistent naming, missing fields, and no shared schema. Today, answering this costs someone 20–40 minutes of manual pulling, cleaning, and cross-referencing — and the answer is stale the moment it's given.

## 3. Target users

| Persona | What they need | What breaks today |
|---|---|---|
| **Founder / CEO** | Fast, trustworthy answers to ad-hoc questions, board-ready summaries | No one to ask on demand; existing dashboards answer yesterday's question, not today's |
| **Ops lead** | Cross-board operational health (work order status vs. committed deals) | Manual joins in spreadsheets, no single source of truth |
| **Sales lead** | Pipeline health by sector/stage/rep | Monday.com filters answer narrow questions, not "why" |

Primary persona for V1: **Founder/CEO** — the agent is scoped and prompted for exec-level framing (trends, risk, caveats), not row-level CRUD.

## 4. Goals
- Answer natural-language BI questions across Work Orders + Deals boards, live from monday.com (never hardcoded CSVs).
- Be honest about data quality — missing/null fields are surfaced as caveats, not silently dropped or guessed.
- Ask a clarifying question when a query is genuinely ambiguous, instead of guessing and asserting.
- Produce a leadership-ready summary of the current state on demand.

## 5. Non-goals (V1)
- Writing back to monday.com (read-only per assignment spec).
- Supporting boards/data sources beyond the two provided.
- Real-time push updates (polling/on-demand sync is sufficient).
- Multi-tenant / multi-workspace support — single monday.com workspace, single account.
- Auth/user management beyond a single shared session (not a product-grade multi-user app).

## 6. Core features

### 6.1 Monday.com integration
- Read-only GraphQL access to both boards.
- On-demand + scheduled sync into a normalized store (see architecture.md) — the agent is always answering from a traceable, recent pull, never a frozen snapshot.

### 6.2 Data resilience
- Null/missing values handled explicitly (e.g., a deal with no close date is flagged, not excluded silently, not defaulted to "today").
- Normalization of dates (multiple input formats → ISO), sector/industry naming (fuzzy-matched aliases → canonical list), free-text fields (trimmed, cased, deduped).
- Every answer that touches incomplete data states the caveat inline ("3 of 14 energy deals have no stage set — excluded from the stage breakdown below").

### 6.3 Query understanding
- Interprets vague, exec-style phrasing ("how's pipeline looking", "quarter" without a stated fiscal calendar).
- Asks a clarifying question only when the ambiguity actually changes the answer (e.g., "this quarter" when today is near a quarter boundary) — not for every query.

### 6.4 Business intelligence
- Answers span: revenue/pipeline value, pipeline health by stage/sector, win-rate trends, work order status vs. deal commitments, operational bottlenecks.
- Cross-board reasoning: e.g., "which deals closed but have no linked work order yet" requires joining both boards on a shared key (account/deal name).
- Every numeric answer states its data source, freshness (last synced at X), and any exclusions applied.

### 6.5 Leadership update prep (interpreted requirement — see decision-log.md)
- On request, the agent produces a structured "state of the business" brief: pipeline summary, operational status, notable risks/callouts, data quality footnotes — formatted for copy-paste into a board update or exec memo. Not a slide generator; a well-structured markdown/HTML brief the founder edits down.

## 7. Representative user stories
1. *As a founder*, I ask "how's our energy sector pipeline this quarter?" and get total value, deal count, stage breakdown, and a caveat about missing close dates — in one turn.
2. *As a founder*, I ask "are we going to hit our work orders on time?" and the agent joins Work Orders status against Deals close dates, flags at-risk items, and states its assumptions.
3. *As an ops lead*, I ask "which deals closed in the last 30 days have no active work order?" and get a short list with account names.
4. *As a founder*, I say "prep this for Monday's leadership update" and get a structured brief I can paste into a doc.
5. *As a founder*, I ask something genuinely ambiguous ("how are we doing?") and the agent asks one clarifying question instead of guessing scope.

## 8. Success criteria
- Every answer is traceable to a monday.com pull (no fabricated numbers) — verified in the Decision Log with example transcripts.
- Data quality issues are surfaced, not hidden, in ≥90% of answers that touch incomplete records.
- A non-technical founder can use the hosted link with zero setup and get a correct answer within 2 conversational turns for the sample questions above.

## 9. Out of scope for this document
Implementation details, folder structure, and tech stack live in `architecture.md`. Coding conventions and AI guardrails live in `rule.md`. Delivery sequencing lives in `phase.md`. Visual identity lives in `design.md`.
