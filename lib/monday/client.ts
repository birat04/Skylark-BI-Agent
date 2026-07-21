import { GraphQLClient } from "graphql-request";

const MONDAY_API_URL = "https://api.monday.com/v2";

let client: GraphQLClient | null = null;

/**
 * Read-only monday.com GraphQL client. Never used for mutations —
 * this integration is read-only by spec (see rule.md §2).
 */
export function getMondayClient(): GraphQLClient {
  if (client) return client;

  const token = process.env.MONDAY_API_TOKEN;
  if (!token) {
    throw new Error("MONDAY_API_TOKEN is not set");
  }

  client = new GraphQLClient(MONDAY_API_URL, {
    headers: {
      Authorization: token,
      "API-Version": "2024-10",
    },
  });

  return client;
}
