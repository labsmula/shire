import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ChatShell } from "@/components/ai/chat-shell";

export default function CandidateLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell role="candidate">
      <div className="space-y-6">
        {children}
        <ChatShell role="candidate" />
      </div>
    </AppShell>
  );
}
