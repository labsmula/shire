import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const companyContextTool = createTool({
  id: "company-context-tool",
  description: "Return a compact company context payload for orchestration.",
  inputSchema: z.object({
    companyId: z.string(),
    scope: z.string().optional(),
  }),
  outputSchema: z.object({
    companyId: z.string(),
    scope: z.string().optional(),
    status: z.string(),
  }),
  execute: async ({ companyId, scope }) => ({
    companyId,
    scope,
    status: "loaded",
  }),
});
