import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";

export function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

  if (!text) return null;

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap text-[0.9375rem] leading-relaxed",
          isUser
            ? "bg-sky-500/15 text-foreground rounded-xl rounded-br-sm px-3.5 py-2.5 border border-sky-500/20"
            : "text-foreground px-1 py-1"
        )}
      >
        {text}
      </div>
    </div>
  );
}
