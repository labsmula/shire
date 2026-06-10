import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const evidenceContextToolId = "evidence-context-tool";

export const evidenceContextInputSchema = z.object({
  referenceId: z.string(),
  note: z.string().optional(),
});

export const evidenceContextOutputSchema = z.object({
  contextType: z.literal("evidence"),
  referenceId: z.string(),
  note: z.string(),
  status: z.literal("ready"),
});

export const evidenceContextTool = createTool({
  id: evidenceContextToolId,
  description: "Return a structured evidence context payload.",
  inputSchema: evidenceContextInputSchema,
  outputSchema: evidenceContextOutputSchema,
  execute: async ({ referenceId, note }) => ({
    contextType: "evidence" as const,
    referenceId,
    note: note ?? "",
    status: "ready" as const,
  }),
});
