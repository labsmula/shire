import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const userContextTool = createTool({
  id: "user-context-tool",
  description: "Return a compact user context payload for orchestration.",
  inputSchema: z.object({
    userId: z.string(),
    scope: z.string().optional(),
  }),
  outputSchema: z.object({
    userId: z.string(),
    scope: z.string().optional(),
    status: z.string(),
  }),
  execute: async ({ userId, scope }) => ({
    userId,
    scope,
    status: "loaded",
  }),
});
