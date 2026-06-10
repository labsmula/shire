import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const companyContextToolId = "company-context-tool";

export const companyContextInputSchema = z.object({
  companyId: z.string(),
  scope: z.string().optional(),
});

export const companyContextOutputSchema = z.object({
  contextType: z.literal("company"),
  companyId: z.string(),
  scope: z.string(),
  status: z.literal("ready"),
});

export const companyContextTool = createTool({
  id: companyContextToolId,
  description: "Return a structured company context payload for orchestration.",
  inputSchema: companyContextInputSchema,
  outputSchema: companyContextOutputSchema,
  execute: async ({ companyId, scope }) => ({
    contextType: "company" as const,
    companyId,
    scope: scope ?? "default",
    status: "ready" as const,
  }),
});
