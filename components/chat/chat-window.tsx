"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "@/components/chat/message-bubble";

const SUGGESTIONS = [
  "How's our energy sector pipeline this quarter?",
  "What's the status of open work orders?",
  "Give me a leadership brief.",
];

export function ChatWindow() {
  const { messages, sendMessage, status, error } = useChat();
  const [input, setInput] = useState("");

  const isBusy = status === "submitted" || status === "streaming";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isBusy) return;
    sendMessage({ text: input });
    setInput("");
  }

  function handleSuggestion(text: string) {
    if (isBusy) return;
    sendMessage({ text });
  }

  return (
    <div className="flex flex-col h-full max-w-190 mx-auto w-full">
      <ScrollArea className="flex-1 px-4">
        <div className="flex flex-col gap-4 py-6">
          {messages.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Ask a question about your pipeline, work orders, or request a
                leadership update brief.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestion(suggestion)}
                    disabled={isBusy}
                    className="rounded-lg border border-border bg-card/50 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-card hover:text-foreground disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error.message || "Something went wrong. Please try again."}
            </div>
          )}
        </div>
      </ScrollArea>

      <form
        onSubmit={handleSubmit}
        className="border-t border-border px-4 py-4 flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Skylark anything…"
          disabled={isBusy}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={isBusy || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
