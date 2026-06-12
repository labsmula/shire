"use client";

import {
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";
import { ArrowUpIcon } from "lucide-react";

import AITextLoading from "@/components/kokonutui/ai-text-loading";

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function EmptyThread() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
      Ask about a role, a candidate, or the current page context.
    </div>
  );
}

// function ThinkingState() {
//   return (
//     <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-3">
//       <AITextLoading
//         containerClassName="p-0"
//         className="text-sm font-semibold tracking-wide"
//         interval={1200}
//         texts={[
//           "Thinking...",
//           "Pulling page context...",
//           "Checking access...",
//           "Writing answer...",
//         ]}
//       />
//     </div>
//   );
// }

export function Thread() {
  return (
    <ThreadPrimitive.Root className="flex h-full min-h-0 flex-col">
      <ThreadPrimitive.Viewport className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <AuiIf condition={(state) => state.thread.isEmpty}>
          <EmptyThread />
        </AuiIf>

        <ThreadPrimitive.Messages>
          {({ message }) =>
            message.role === "user" ? <UserMessage /> : <AssistantMessage />
          }
        </ThreadPrimitive.Messages>

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 pt-2">
          <ComposerPrimitive.Root className="rounded-2xl border border-border bg-background p-2 shadow-sm">
            <ComposerPrimitive.Input
              placeholder="Ask the assistant..."
              className="min-h-11 w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              rows={1}
            />
            <div className="flex justify-end px-1 pb-1">
              <ComposerPrimitive.Send className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40">
                <ArrowUpIcon className="size-4" />
              </ComposerPrimitive.Send>
            </div>
          </ComposerPrimitive.Root>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}
