import type { LanguageModelMiddleware } from "ai";
import type {
  LanguageModelV4CallOptions,
  LanguageModelV4Message,
} from "@ai-sdk/provider";

// Groq's chat API rejects `reasoning_content` on follow-up turns, but the
// openai-compatible provider re-injects reasoning parts from prior assistant
// messages during multi-step tool loops. Strip them before each Groq call.
function stripReasoningFromMessage(
  message: LanguageModelV4Message
): LanguageModelV4Message {
  if (message.role !== "assistant" || !Array.isArray(message.content)) {
    return message;
  }

  return {
    ...message,
    content: message.content.filter(
      (part) => part.type !== "reasoning" && part.type !== "reasoning-file"
    ),
  };
}

export const groqStripReasoningMiddleware: LanguageModelMiddleware = {
  transformParams: async ({ params }: { params: LanguageModelV4CallOptions }) => ({
    ...params,
    prompt: params.prompt.map(stripReasoningFromMessage),
  }),
};
