import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const candidateContextTool = createTool({
  id: "candidate-context-tool",
  description: "Return a compact candidate context payload for orchestration.",
  inputSchema: z.object({
    candidateId: z.string(),
    scope: z.string().optional(),
  }),
  outputSchema: z.object({
    candidateId: z.string(),
    scope: z.string().optional(),
    status: z.string(),
  }),
  execute: async ({ candidateId, scope }) => ({
    candidateId,
    scope,
    status: "loaded",
  }),
});
