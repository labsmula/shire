import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

const talentMatchingStep = createStep({
  id: "talent-matching-step",
  inputSchema: z.object({
    companyNeed: z.string(),
    talentProfile: z.string(),
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
          (inputData.companyNeed.length + inputData.talentProfile.length) / 10,
        ),
      ),
    );

    return {
      matchSummary: "Talent and company need have been normalized for review.",
      score,
    };
  },
});

export const talentMatchingWorkflow = createWorkflow({
  id: "talent-matching-workflow",
  inputSchema: z.object({
    companyNeed: z.string(),
    talentProfile: z.string(),
  }),
  outputSchema: z.object({
    matchSummary: z.string(),
    score: z.number(),
  }),
})
  .then(talentMatchingStep)
  .commit();
