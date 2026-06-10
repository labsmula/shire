import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const matchingContextTool = createTool({
  id: "matching-context-tool",
  description: "Return a compact matching payload for orchestration.",
  inputSchema: z.object({
    subjectId: z.string(),
    targetId: z.string(),
  }),
  outputSchema: z.object({
    subjectId: z.string(),
    targetId: z.string(),
    score: z.number(),
  }),
  execute: async ({ subjectId, targetId }) => ({
    subjectId,
    targetId,
    score: 75,
  }),
});
