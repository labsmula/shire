import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const jobContextToolId = "job-context-tool";

export const jobContextInputSchema = z.object({
  jobId: z.string(),
  scope: z.string().optional(),
});

export const jobContextOutputSchema = z.object({
  contextType: z.literal("job"),
  jobId: z.string(),
  scope: z.string(),
  status: z.literal("ready"),
});

export const jobContextTool = createTool({
  id: jobContextToolId,
  description: "Return a structured job context payload for orchestration.",
  inputSchema: jobContextInputSchema,
  outputSchema: jobContextOutputSchema,
  execute: async ({ jobId, scope }) => ({
    contextType: "job" as const,
    jobId,
    scope: scope ?? "default",
    status: "ready" as const,
  }),
});
