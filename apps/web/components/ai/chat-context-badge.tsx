"use client";

export function ChatContextBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {label}
    </span>
  );
}
