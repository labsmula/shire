import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

const disputeSummaryStep = createStep({
  id: "dispute-summary-step",
  inputSchema: z.object({
    issue: z.string(),
    evidence: z.string(),
  }),
  outputSchema: z.object({
    summary: z.string(),
    recommendedAction: z.string(),
  }),
  execute: async ({ inputData }) => ({
    summary: `${inputData.issue.trim()} | Evidence: ${inputData.evidence.trim().slice(0, 160)}`,
    recommendedAction: "Review evidence, confirm ownership, and resolve with a clear next action.",
  }),
});

export const disputeSummaryWorkflow = createWorkflow({
  id: "dispute-summary-workflow",
  inputSchema: z.object({
    issue: z.string(),
    evidence: z.string(),
  }),
  outputSchema: z.object({
    summary: z.string(),
    recommendedAction: z.string(),
  }),
})
  .then(disputeSummaryStep)
  .commit();
