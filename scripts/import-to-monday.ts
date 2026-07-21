/**
 * One-time setup script: reads the two source CSVs and provisions them as
 * monday.com boards (see doc/phase.md Phase 0). This is the ONLY place in the
 * codebase that writes to monday.com — the running app is read-only (doc/rule.md §2).
 *
 * Run with:  npm run import:monday
 * Requires MONDAY_API_TOKEN (write-scoped) in .env.
 *
 * Resumable: board/column ids are checkpointed to lib/monday/board-config.json
 * after every mutation, so if the script dies partway (e.g. monday.com's
 * complexity-budget rate limit), rerunning it picks up where it left off instead
 * of creating a duplicate board. If a board already has items, item import is
 * skipped entirely rather than risking duplicate rows.
 *
 * Deliberately does NOT clean the source data — it imports it exactly as found,
 * including blank cells and the header-echo artifact rows (a pasted-in header row
 * that landed as data in the Deals CSV). Cleaning happens at sync/query time in
 * lib/monday/, not here — see doc/decision-log.md for why.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import { GraphQLClient, gql, ClientError } from "graphql-request";
import { normalizeDate } from "../lib/normalize/dates";
import { isHeaderEchoRow } from "../lib/normalize/validity";

const MONDAY_API_URL = "https://api.monday.com/v2";
const DATA_DIR = join(__dirname, "..", "data");
const CONFIG_PATH = join(__dirname, "..", "lib", "monday", "board-config.json");

type ColumnType = "text" | "long_text" | "numbers" | "date" | "status" | "dropdown";

interface ColumnPlan {
  header: string; // exact CSV column header
  title: string; // monday.com column title (usually same as header)
  type: ColumnType;
}

interface BoardState {
  boardId: string | null;
  columnIds: Record<string, string>;
  itemsImported: boolean;
}

interface FullConfig {
  workOrders: BoardState;
  deals: BoardState;
}

function loadConfig(): FullConfig {
  if (existsSync(CONFIG_PATH)) {
    const parsed = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    // Backfill for configs written before itemsImported existed.
    if (parsed.workOrders.itemsImported === undefined) parsed.workOrders.itemsImported = false;
    if (parsed.deals.itemsImported === undefined) parsed.deals.itemsImported = false;
    return parsed;
  }
  return {
    workOrders: { boardId: null, columnIds: {}, itemsImported: false },
    deals: { boardId: null, columnIds: {}, itemsImported: false },
  };
}

function saveConfig(config: FullConfig) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// --- Work Orders board plan -------------------------------------------------
// Column type choices documented in doc/decision-log.md. Quantity fields keep
// unit-suffixed values ("5360 HA") as text rather than forcing monday's numeric
// type to reject/mangle them — normalization happens downstream, not here.
const WORK_ORDER_ITEM_NAME_HEADER = "Serial #"; // unique per row, unlike deal name
const WORK_ORDER_COLUMNS: ColumnPlan[] = [
  { header: "Deal name masked", title: "Deal name masked", type: "text" },
  { header: "Customer Name Code", title: "Customer Name Code", type: "text" },
  { header: "Serial #", title: "Serial #", type: "text" },
  { header: "Nature of Work", title: "Nature of Work", type: "dropdown" },
  {
    header: "Last executed month of recurring project",
    title: "Last executed month of recurring project",
    type: "text",
  },
  { header: "Execution Status", title: "Execution Status", type: "status" },
  { header: "Data Delivery Date", title: "Data Delivery Date", type: "date" },
  { header: "Date of PO/LOI", title: "Date of PO/LOI", type: "date" },
  { header: "Document Type", title: "Document Type", type: "dropdown" },
  { header: "Probable Start Date", title: "Probable Start Date", type: "date" },
  { header: "Probable End Date", title: "Probable End Date", type: "date" },
  { header: "BD/KAM Personnel code", title: "BD/KAM Personnel code", type: "text" },
  { header: "Sector", title: "Sector", type: "dropdown" },
  { header: "Type of Work", title: "Type of Work", type: "text" },
  {
    header: "Is any Skylark software platform part of the client deliverables in this deal?",
    title: "Skylark software platform in deliverables?",
    type: "text",
  },
  { header: "Last invoice date", title: "Last invoice date", type: "date" },
  { header: "latest invoice no.", title: "latest invoice no.", type: "text" },
  {
    header: "Amount in Rupees (Excl of GST) (Masked)",
    title: "Amount in Rupees (Excl of GST) (Masked)",
    type: "numbers",
  },
  {
    header: "Amount in Rupees (Incl of GST) (Masked)",
    title: "Amount in Rupees (Incl of GST) (Masked)",
    type: "numbers",
  },
  {
    header: "Billed Value in Rupees (Excl of GST.) (Masked)",
    title: "Billed Value in Rupees (Excl of GST.) (Masked)",
    type: "numbers",
  },
  {
    header: "Billed Value in Rupees (Incl of GST.) (Masked)",
    title: "Billed Value in Rupees (Incl of GST.) (Masked)",
    type: "numbers",
  },
  {
    header: "Collected Amount in Rupees (Incl of GST.) (Masked)",
    title: "Collected Amount in Rupees (Incl of GST.) (Masked)",
    type: "numbers",
  },
  {
    header: "Amount to be billed in Rs. (Exl. of GST) (Masked)",
    title: "Amount to be billed in Rs. (Exl. of GST) (Masked)",
    type: "numbers",
  },
  {
    header: "Amount to be billed in Rs. (Incl. of GST) (Masked)",
    title: "Amount to be billed in Rs. (Incl. of GST) (Masked)",
    type: "numbers",
  },
  { header: "Amount Receivable (Masked)", title: "Amount Receivable (Masked)", type: "numbers" },
  { header: "AR Priority account", title: "AR Priority account", type: "text" },
  { header: "Quantity by Ops", title: "Quantity by Ops", type: "text" },
  { header: "Quantities as per PO", title: "Quantities as per PO", type: "text" },
  { header: "Quantity billed (till date)", title: "Quantity billed (till date)", type: "text" },
  { header: "Balance in quantity", title: "Balance in quantity", type: "text" },
  { header: "Invoice Status", title: "Invoice Status", type: "text" },
  { header: "Expected Billing Month", title: "Expected Billing Month", type: "text" },
  { header: "Actual Billing Month", title: "Actual Billing Month", type: "text" },
  { header: "Actual Collection Month", title: "Actual Collection Month", type: "text" },
  { header: "WO Status (billed)", title: "WO Status (billed)", type: "status" },
  { header: "Collection status", title: "Collection status", type: "text" },
  { header: "Collection Date", title: "Collection Date", type: "date" },
  { header: "Billing Status", title: "Billing Status", type: "text" },
];

// --- Deals board plan --------------------------------------------------------
const DEAL_ITEM_NAME_HEADER = "Deal Name";
const DEAL_COLUMNS: ColumnPlan[] = [
  { header: "Deal Name", title: "Deal Name", type: "text" }, // mirrors item name; see doc/decision-log.md
  { header: "Owner code", title: "Owner code", type: "text" },
  { header: "Client Code", title: "Client Code", type: "text" },
  { header: "Deal Status", title: "Deal Status", type: "status" },
  { header: "Close Date (A)", title: "Close Date (A)", type: "date" },
  { header: "Closure Probability", title: "Closure Probability", type: "dropdown" },
  { header: "Masked Deal value", title: "Masked Deal value", type: "numbers" },
  { header: "Tentative Close Date", title: "Tentative Close Date", type: "date" },
  { header: "Deal Stage", title: "Deal Stage", type: "status" },
  { header: "Product deal", title: "Product deal", type: "dropdown" },
  { header: "Sector/service", title: "Sector/service", type: "dropdown" },
  { header: "Created Date", title: "Created Date", type: "date" },
];

function getClient(): GraphQLClient {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) throw new Error("MONDAY_API_TOKEN is not set (needs write access for this script)");
  return new GraphQLClient(MONDAY_API_URL, {
    headers: { Authorization: token, "API-Version": "2024-10" },
  });
}

function extractRetryAfterSeconds(err: unknown): number | null {
  if (err instanceof ClientError) {
    const ext = err.response?.errors?.[0]?.extensions as
      | { retry_in_seconds?: number }
      | undefined;
    if (typeof ext?.retry_in_seconds === "number") return ext.retry_in_seconds;
  }
  return null;
}

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 6): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryAfter = extractRetryAfterSeconds(err);
      // Honor monday.com's actual complexity-budget reset time, not a guessed backoff —
      // this is exactly what caused the first import attempt to fail outright.
      const waitMs = retryAfter !== null ? (retryAfter + 1) * 1000 : 500 * (i + 1);
      console.warn(
        `  [retry] ${label} failed (attempt ${i + 1}/${attempts}): ${err instanceof Error ? err.message : err}. Waiting ${waitMs}ms.`
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastErr;
}

function readCsvRows(filename: string): Record<string, string>[] {
  const raw = readFileSync(join(DATA_DIR, filename), "utf-8");
  // Strip a fully-blank leading line if present (observed in the Work Orders export) —
  // this is parser setup, not "cleaning" business data.
  const lines = raw.split(/\r?\n/);
  while (lines.length > 0 && lines[0].replace(/,/g, "").trim() === "") {
    lines.shift();
  }
  const cleanedRaw = lines.join("\n");
  return parse(cleanedRaw, { columns: true, skip_empty_lines: true, relax_column_count: true });
}

function buildColumnValue(type: ColumnType, rawValue: string): unknown {
  const value = rawValue.trim();
  if (!value) return undefined;

  switch (type) {
    case "text":
    case "long_text":
      return value;
    case "numbers": {
      const cleaned = value.replace(/[^0-9.-]/g, "");
      return cleaned ? cleaned : undefined;
    }
    case "date": {
      const iso = normalizeDate(value);
      return iso ? { date: iso } : undefined;
    }
    case "status":
      return { label: value };
    case "dropdown":
      return { labels: [value] };
  }
}

async function createBoard(client: GraphQLClient, name: string): Promise<string> {
  const mutation = gql`
    mutation CreateBoard($name: String!) {
      create_board(board_name: $name, board_kind: public) {
        id
      }
    }
  `;
  const res = await withRetry(
    () => client.request<{ create_board: { id: string } }>(mutation, { name }),
    `create_board(${name})`
  );
  return res.create_board.id;
}

async function createColumn(
  client: GraphQLClient,
  boardId: string,
  title: string,
  columnType: ColumnType
): Promise<string> {
  const mutation = gql`
    mutation CreateColumn($boardId: ID!, $title: String!, $columnType: ColumnType!) {
      create_column(board_id: $boardId, title: $title, column_type: $columnType) {
        id
      }
    }
  `;
  const res = await withRetry(
    () =>
      client.request<{ create_column: { id: string } }>(mutation, {
        boardId,
        title,
        columnType,
      }),
    `create_column(${title})`
  );
  return res.create_column.id;
}

const PAGE_SIZE = Number(process.env.MONDAY_PAGE_SIZE ?? 100);

async function getAllItemIds(client: GraphQLClient, boardId: string): Promise<string[]> {
  const query = gql`
    query BoardItemIds($boardId: ID!, $cursor: String, $limit: Int!) {
      boards(ids: [$boardId]) {
        items_page(limit: $limit, cursor: $cursor) {
          cursor
          items {
            id
          }
        }
      }
    }
  `;
  const ids: string[] = [];
  let cursor: string | null = null;
  do {
    const res = await withRetry(
      () =>
        client.request<{ boards: { items_page: { cursor: string | null; items: { id: string }[] } }[] }>(
          query,
          { boardId, cursor, limit: PAGE_SIZE }
        ),
      "getAllItemIds"
    );
    const page = res.boards[0]?.items_page;
    if (!page) break;
    ids.push(...page.items.map((i) => i.id));
    cursor = page.cursor;
  } while (cursor);
  return ids;
}

async function deleteItem(client: GraphQLClient, itemId: string): Promise<void> {
  const mutation = gql`
    mutation DeleteItem($itemId: ID!) {
      delete_item(item_id: $itemId) {
        id
      }
    }
  `;
  await withRetry(
    () => client.request(mutation, { itemId }),
    `delete_item(${itemId})`
  );
}

async function createItem(
  client: GraphQLClient,
  boardId: string,
  itemName: string,
  columnValues: Record<string, unknown>
): Promise<string> {
  const mutation = gql`
    mutation CreateItem($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(
        board_id: $boardId
        item_name: $itemName
        column_values: $columnValues
        create_labels_if_missing: true
      ) {
        id
      }
    }
  `;
  const res = await client.request<{ create_item: { id: string } }>(mutation, {
    boardId,
    itemName,
    columnValues: JSON.stringify(columnValues),
  });
  return res.create_item.id;
}

interface ImportSummary {
  itemsCreated: number;
  itemsDegraded: number;
  itemsFailed: number;
  itemsSkippedAlreadyImported: number;
  rowsSkippedHeaderEcho: number;
}

async function importBoard(
  client: GraphQLClient,
  boardName: string,
  csvFile: string,
  columns: ColumnPlan[],
  itemNameHeader: string,
  state: BoardState,
  persist: () => void
): Promise<ImportSummary> {
  console.log(`\n=== ${boardName} ===`);
  const rows = readCsvRows(csvFile);
  console.log(`Read ${rows.length} rows from ${csvFile}`);

  if (state.boardId) {
    console.log(`Resuming existing board ${boardName} (id: ${state.boardId})`);
  } else {
    state.boardId = await createBoard(client, boardName);
    persist();
    console.log(`Created board ${boardName} (id: ${state.boardId})`);
  }
  const boardId = state.boardId;

  for (const col of columns) {
    if (state.columnIds[col.header]) {
      console.log(`  = column "${col.title}" already exists -> ${state.columnIds[col.header]}`);
      continue;
    }
    await new Promise((r) => setTimeout(r, 300));
    state.columnIds[col.header] = await createColumn(client, boardId, col.title, col.type);
    persist();
    console.log(`  + column "${col.title}" (${col.type}) -> ${state.columnIds[col.header]}`);
  }

  let itemsCreated = 0;
  let itemsDegraded = 0;
  let itemsFailed = 0;
  let rowsSkippedHeaderEcho = 0;

  if (state.itemsImported) {
    console.log(
      `${boardName} already fully imported (itemsImported=true in board-config.json) — skipping. Delete the board in monday.com and reset this flag to force a clean reimport.`
    );
    return {
      itemsCreated: 0,
      itemsDegraded: 0,
      itemsFailed: 0,
      itemsSkippedAlreadyImported: 1,
      rowsSkippedHeaderEcho: 0,
    };
  }

  // Any items present at this point are either monday.com's auto-created default
  // item ("Item 1") or leftovers from an interrupted previous attempt — since we
  // only reach here when itemsImported is still false, it's always safe to clear
  // them and reimport clean rather than trying to diff against partial state.
  const strayItemIds = await getAllItemIds(client, boardId);
  if (strayItemIds.length > 0) {
    console.log(`Clearing ${strayItemIds.length} stray/default item(s) before import...`);
    for (const id of strayItemIds) {
      await deleteItem(client, id);
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  for (const [i, row] of rows.entries()) {
    if (isHeaderEchoRow(row)) {
      rowsSkippedHeaderEcho += 1;
      continue;
    }

    const itemName = row[itemNameHeader]?.trim() || `(unnamed row ${i + 1})`;

    const fullColumnValues: Record<string, unknown> = {};
    for (const col of columns) {
      const value = buildColumnValue(col.type, row[col.header] ?? "");
      if (value !== undefined) fullColumnValues[state.columnIds[col.header]] = value;
    }

    await new Promise((r) => setTimeout(r, 250));

    try {
      await createItem(client, boardId, itemName, fullColumnValues);
      itemsCreated += 1;
    } catch (err) {
      const retryAfter = extractRetryAfterSeconds(err);
      if (retryAfter !== null) {
        // Rate limit, not a data problem — wait it out and retry this same row once
        // rather than treating it as a degrade-worthy failure.
        console.warn(`  [rate-limit] waiting ${retryAfter + 1}s before retrying row ${i + 1}`);
        await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000));
        try {
          await createItem(client, boardId, itemName, fullColumnValues);
          itemsCreated += 1;
          continue;
        } catch {
          // fall through to degrade path below
        }
      }

      console.warn(
        `  [degrade] item "${itemName}" (row ${i + 1}) failed with full payload: ${err instanceof Error ? err.message : err}. Retrying with text/number/date fields only.`
      );
      const degradedColumnValues: Record<string, unknown> = {};
      for (const col of columns) {
        if (col.type === "status" || col.type === "dropdown") continue;
        const value = buildColumnValue(col.type, row[col.header] ?? "");
        if (value !== undefined) degradedColumnValues[state.columnIds[col.header]] = value;
      }
      try {
        await createItem(client, boardId, itemName, degradedColumnValues);
        itemsDegraded += 1;
      } catch (err2) {
        itemsFailed += 1;
        console.error(
          `  [failed] item "${itemName}" (row ${i + 1}) could not be created at all: ${err2 instanceof Error ? err2.message : err2}`
        );
      }
    }
  }

  console.log(
    `${boardName}: ${itemsCreated} created, ${itemsDegraded} degraded (status/dropdown dropped), ${itemsFailed} failed, ${rowsSkippedHeaderEcho} skipped (header-echo rows)`
  );

  state.itemsImported = true;
  persist();

  return {
    itemsCreated,
    itemsDegraded,
    itemsFailed,
    itemsSkippedAlreadyImported: 0,
    rowsSkippedHeaderEcho,
  };
}

async function main() {
  const client = getClient();
  const config = loadConfig();
  const persist = () => saveConfig(config);

  await importBoard(
    client,
    "Work Orders",
    "Work_Order_Tracker Data.xlsx - work order tracker.csv",
    WORK_ORDER_COLUMNS,
    WORK_ORDER_ITEM_NAME_HEADER,
    config.workOrders,
    persist
  );

  await importBoard(
    client,
    "Deals",
    "Deal funnel Data.xlsx - Deal tracker.csv",
    DEAL_COLUMNS,
    DEAL_ITEM_NAME_HEADER,
    config.deals,
    persist
  );

  console.log(`\nboard-config.json is up to date at ${CONFIG_PATH}`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
