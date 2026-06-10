import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const userContextToolId = "user-context-tool";

export const userContextInputSchema = z.object({
  userId: z.string(),
  scope: z.string().optional(),
});

export const userContextOutputSchema = z.object({
  contextType: z.literal("user"),
  userId: z.string(),
  scope: z.string(),
  status: z.literal("ready"),
});

export const userContextTool = createTool({
  id: userContextToolId,
  description: "Return a structured user context payload for orchestration.",
  inputSchema: userContextInputSchema,
  outputSchema: userContextOutputSchema,
  execute: async ({ userId, scope }) => ({
    contextType: "user" as const,
    userId,
    scope: scope ?? "default",
    status: "ready" as const,
  }),
});
