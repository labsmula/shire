import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

export const disputeSummaryWorkflowId = "dispute-summary-workflow" as const;

export const disputeSummaryInputSchema = z.object({
  issue: z.string(),
  evidence: z.string(),
});

export const disputeSummaryOutputSchema = z.object({
  summary: z.string(),
  recommendedAction: z.string(),
});

export function normalizeDisputeSummary(issue: string, evidence: string) {
  return {
    summary: `${issue.trim()} | Evidence: ${evidence.trim().slice(0, 160)}`,
    recommendedAction:
      "Review evidence, confirm ownership, and resolve with a clear next action.",
  };
}

const disputeSummaryStep = createStep({
  id: "dispute-summary-step",
  inputSchema: disputeSummaryInputSchema,
  outputSchema: disputeSummaryOutputSchema,
  execute: async ({ inputData }) =>
    normalizeDisputeSummary(inputData.issue, inputData.evidence),
});

export const disputeSummaryWorkflow = createWorkflow({
  id: disputeSummaryWorkflowId,
  inputSchema: disputeSummaryInputSchema,
  outputSchema: disputeSummaryOutputSchema,
})
  .then(disputeSummaryStep)
  .commit();
