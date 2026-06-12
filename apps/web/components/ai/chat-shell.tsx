"use client";

import { usePathname } from "next/navigation";

import { ChatPanel } from "./chat-panel";
import { resolveChatScopeForPathname } from "@/lib/chat/context";
import { useShireStore } from "@/lib/store";
import type { AppRole } from "@/lib/types";

export function ChatShell({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const jobs = useShireStore((state) => state.jobs);
  const candidateProfile = useShireStore((state) => state.candidateProfile);
  const recruiterProfile = useShireStore((state) => state.recruiterProfile);

  if (role === "admin") {
    return null;
  }

  const scope = resolveChatScopeForPathname({
    role,
    pathname,
    jobs,
    candidateProfileLabel: candidateProfile?.displayName,
    recruiterProfileLabel: recruiterProfile?.companyName,
  });

  return (
    <ChatPanel
      api={`/api/chat/${scope.scope}`}
      scope={scope}
      title="Shire assistant"
    />
  );
}
