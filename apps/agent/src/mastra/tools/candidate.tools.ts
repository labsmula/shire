import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const candidateContextToolId = "candidate-context-tool";

export const candidateContextInputSchema = z.object({
  candidateId: z.string(),
  scope: z.string().optional(),
});

export const candidateContextOutputSchema = z.object({
  contextType: z.literal("candidate"),
  candidateId: z.string(),
  scope: z.string(),
  status: z.literal("ready"),
});

export const candidateContextTool = createTool({
  id: candidateContextToolId,
  description:
    "Return a structured candidate context payload for orchestration.",
  inputSchema: candidateContextInputSchema,
  outputSchema: candidateContextOutputSchema,
  execute: async ({ candidateId, scope }) => ({
    contextType: "candidate" as const,
    candidateId,
    scope: scope ?? "default",
    status: "ready" as const,
  }),
});
