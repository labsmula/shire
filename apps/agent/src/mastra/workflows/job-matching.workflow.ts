import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

export const jobMatchingWorkflowId = "job-matching-workflow" as const;

export const jobMatchingInputSchema = z.object({
  candidateSummary: z.string(),
  jobDescription: z.string(),
});

export const jobMatchingOutputSchema = z.object({
  matchSummary: z.string(),
  score: z.number().int().min(0).max(100),
});

export function normalizeJobMatching(
  candidateSummary: string,
  jobDescription: string,
) {
  const score = Math.min(
    100,
    Math.max(
      0,
      Math.round((candidateSummary.length + jobDescription.length) / 10),
    ),
  );

  return {
    matchSummary: "Candidate and job have been normalized for matching review.",
    score,
  };
}

const jobMatchingStep = createStep({
  id: "job-matching-step",
  inputSchema: jobMatchingInputSchema,
  outputSchema: jobMatchingOutputSchema,
  execute: async ({ inputData }) =>
    normalizeJobMatching(inputData.candidateSummary, inputData.jobDescription),
});

export const jobMatchingWorkflow = createWorkflow({
  id: jobMatchingWorkflowId,
  inputSchema: jobMatchingInputSchema,
  outputSchema: jobMatchingOutputSchema,
})
  .then(jobMatchingStep)
  .commit();
