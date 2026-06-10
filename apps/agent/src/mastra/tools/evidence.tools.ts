import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const evidenceContextTool = createTool({
  id: "evidence-context-tool",
  description: "Return a compact evidence payload for orchestration.",
  inputSchema: z.object({
    referenceId: z.string(),
    note: z.string().optional(),
  }),
  outputSchema: z.object({
    referenceId: z.string(),
    note: z.string().optional(),
    status: z.string(),
  }),
  execute: async ({ referenceId, note }) => ({
    referenceId,
    note,
    status: "loaded",
  }),
});
