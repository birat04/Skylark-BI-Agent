import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { wrapLanguageModel } from "ai";
import { groqStripReasoningMiddleware } from "@/lib/ai/groq-middleware";

let groq: ReturnType<typeof createOpenAICompatible> | null = null;

// Lazy init: fails at first call, not at module import — see lib/db/client.ts for why.
function getGroq() {
  if (groq) return groq;

  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set");
  }

  // Groq hosts open-weight models behind an OpenAI-compatible API, so it's wired
  // through the generic openai-compatible provider (see doc/architecture.md §1).
  groq = createOpenAICompatible({
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
  });

  return groq;
}

export function getChatModel() {
  // qwen/qwen3.6-27b: reliable tool calling on Groq. llama-3.3-70b-versatile often
  // emits malformed tool names (args embedded in name) → tool_use_failed.
  const model = process.env.GROQ_MODEL ?? "qwen/qwen3.6-27b";

  return wrapLanguageModel({
    model: getGroq()(model),
    middleware: groqStripReasoningMiddleware,
  });
}
