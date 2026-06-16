"use client";

import {
  AssistantModalPrimitive,
  AssistantRuntimeProvider,
} from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import { useMemo } from "react";
import { BotIcon } from "lucide-react";

import { ChatContextBadge } from "./chat-context-badge";
import { Thread } from "@/components/assistant-ui/thread";
import { Button } from "@/components/ui/button";
import { useAccessToken } from "@/lib/auth/use-access-token";
import { buildChatContextLabel } from "@/lib/chat/context";
import type { ChatScopeRequest } from "@/lib/chat/types";

export function ChatPanel({
  api,
  scope,
  title,
}: {
  api: string;
  scope: ChatScopeRequest;
  title: string;
}) {
  const accessToken = useAccessToken();
  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api,
        headers: async (): Promise<Record<string, string>> => {
          const token = await accessToken();
          return token ? { authorization: `Bearer ${token}` } : {};
        },
        prepareSendMessagesRequest({ messages }) {
          return {
            body: {
              role: scope.role,
              resourceType: scope.resourceType,
              resourceId: scope.resourceId,
              resourceLabel: scope.resourceLabel,
              messages,
            },
          };
        },
      }),
    [accessToken, api, scope],
  );

  const runtime = useChatRuntime({ transport });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantModalPrimitive.Root>
        <AssistantModalPrimitive.Anchor className="fixed bottom-4 right-4 z-50">
          <AssistantModalPrimitive.Trigger asChild>
            <Button
              aria-label="Open assistant"
              className="size-14 rounded-full shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
              size="icon"
            >
              <BotIcon className="size-5" />
            </Button>
          </AssistantModalPrimitive.Trigger>
        </AssistantModalPrimitive.Anchor>

        <AssistantModalPrimitive.Content
          className="z-50 flex h-[min(80vh,42rem)] w-[min(92vw,26rem)] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
          sideOffset={16}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">
                Scope-aware assistant for the current page.
              </p>
            </div>
            <ChatContextBadge label={buildChatContextLabel(scope)} />
          </div>

          <div className="flex-1 overflow-hidden">
            <Thread />
          </div>
        </AssistantModalPrimitive.Content>
      </AssistantModalPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}
