import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ChatShell } from "@/components/ai/chat-shell";

export default function RecruiterLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell role="recruiter">
      <div className="space-y-6">
        {children}
        <ChatShell role="recruiter" />
      </div>
    </AppShell>
  );
}
