import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const matchingContextToolId = "matching-context-tool";

export const matchingContextInputSchema = z.object({
  subjectId: z.string(),
  targetId: z.string(),
});

export const matchingContextOutputSchema = z.object({
  contextType: z.literal("matching"),
  subjectId: z.string(),
  targetId: z.string(),
  relationshipKey: z.string(),
  score: z.literal(75),
  status: z.literal("ready"),
});

export const matchingContextTool = createTool({
  id: matchingContextToolId,
  description: "Return a structured pairwise matching context payload.",
  inputSchema: matchingContextInputSchema,
  outputSchema: matchingContextOutputSchema,
  execute: async ({ subjectId, targetId }) => ({
    contextType: "matching" as const,
    subjectId,
    targetId,
    relationshipKey: `${subjectId}:${targetId}`,
    score: 75 as const,
    status: "ready" as const,
  }),
});
