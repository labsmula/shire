import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

const jobMatchingStep = createStep({
  id: "job-matching-step",
  inputSchema: z.object({
    candidateSummary: z.string(),
    jobDescription: z.string(),
  }),
  outputSchema: z.object({
    matchSummary: z.string(),
    score: z.number(),
  }),
  execute: async ({ inputData }) => {
    const score = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          (inputData.candidateSummary.length + inputData.jobDescription.length) / 10,
        ),
      ),
    );

    return {
      matchSummary: "Candidate and job have been normalized for matching review.",
      score,
    };
  },
});

export const jobMatchingWorkflow = createWorkflow({
  id: "job-matching-workflow",
  inputSchema: z.object({
    candidateSummary: z.string(),
    jobDescription: z.string(),
  }),
  outputSchema: z.object({
    matchSummary: z.string(),
    score: z.number(),
  }),
})
  .then(jobMatchingStep)
  .commit();
