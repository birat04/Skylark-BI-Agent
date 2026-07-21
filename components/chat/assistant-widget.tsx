"use client";

import { useState } from "react";
import { Bird } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ChatWindow } from "@/components/chat/chat-window";

// Rendered once in app/layout.tsx so it's available on every page, current and
// future, rather than tied to a specific route.
export function AssistantWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 z-40 size-12 rounded-full shadow-lg bg-linear-to-br from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 border-0"
        aria-label="Open Skylark BI Agent"
      >
        <Bird className="size-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[420px] p-0 flex flex-col"
        >
          <SheetHeader className="border-b border-border px-4 py-4">
            <SheetTitle className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-linear-to-br from-sky-400 to-teal-500">
                <Bird className="size-3.5 text-white" />
              </span>
              Skylark BI Agent
            </SheetTitle>
            <SheetDescription>
              Ask about pipeline, work orders, or request a leadership update.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 min-h-0">
            <ChatWindow />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
