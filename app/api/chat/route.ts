import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { getChatModel } from "@/lib/ai/provider";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { queryDealsTool } from "@/lib/ai/tools/query-deals";
import { queryWorkOrdersTool } from "@/lib/ai/tools/query-work-orders";
import { joinDealsToWorkOrdersTool } from "@/lib/ai/tools/join-deals-work-orders";
import { dataQualityReportTool } from "@/lib/ai/tools/data-quality-report";
import { generateLeadershipBriefTool } from "@/lib/ai/tools/generate-leadership-brief";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: getChatModel(),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    // Without this, streamText stops after the first tool call and never lets the
    // model read the result back and synthesize an actual answer (observed live:
    // finishReason "tool-calls" with no text at all) — see doc/rule.md §4.
    stopWhen: stepCountIs(5),
    tools: {
      queryDeals: queryDealsTool,
      queryWorkOrders: queryWorkOrdersTool,
      joinDealsToWorkOrders: joinDealsToWorkOrdersTool,
      getDataQualityReport: dataQualityReportTool,
      generateLeadershipBrief: generateLeadershipBriefTool,
    },
  });

  return result.toUIMessageStreamResponse();
}
