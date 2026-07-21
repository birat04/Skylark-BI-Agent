import { getMondayClient } from "@/lib/monday/client";
import { gql } from "graphql-request";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CONFIG_PATH = join(process.cwd(), "lib/monday/board-config.json");

const BOARD_COLUMNS = gql`
  query BoardColumns($boardId: ID!) {
    boards(ids: [$boardId]) {
      id
      name
      columns {
        id
        title
      }
    }
  }
`;

async function main() {
  const client = getMondayClient();
  const config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));

  const boardList = await client.request<{
    boards: Array<{ id: string; name: string }>;
  }>(gql`query { boards(limit: 50) { id name } }`);

  const dealsBoard = boardList.boards.find((b) => b.name === "Deals");
  const workOrdersBoard = boardList.boards.find((b) => b.name === "Work Orders");

  if (!dealsBoard || !workOrdersBoard) {
    throw new Error("Could not find Deals or Work Orders boards in monday.com");
  }

  for (const [key, board] of [
    ["deals", dealsBoard],
    ["workOrders", workOrdersBoard],
  ] as const) {
    const res = await client.request<{
      boards: Array<{ columns: Array<{ id: string; title: string }> }>;
    }>(BOARD_COLUMNS, { boardId: board.id });

    const byTitle = new Map(
      (res.boards[0]?.columns ?? []).map((col) => [col.title, col.id])
    );

    const columnIds: Record<string, string> = {};
    for (const header of Object.keys(config[key].columnIds)) {
      const id = byTitle.get(header);
      if (id) columnIds[header] = id;
    }

    config[key].boardId = board.id;
    config[key].columnIds = columnIds;
    config[key].itemsImported = true;

    console.log(`${key}: board ${board.id}, ${Object.keys(columnIds).length} columns mapped`);
  }

  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log("Updated", CONFIG_PATH);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
