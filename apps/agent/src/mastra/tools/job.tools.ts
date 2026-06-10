import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const jobContextTool = createTool({
  id: "job-context-tool",
  description: "Return a compact job context payload for orchestration.",
  inputSchema: z.object({
    jobId: z.string(),
    scope: z.string().optional(),
  }),
  outputSchema: z.object({
    jobId: z.string(),
    scope: z.string().optional(),
    status: z.string(),
  }),
  execute: async ({ jobId, scope }) => ({
    jobId,
    scope,
    status: "loaded",
  }),
});
