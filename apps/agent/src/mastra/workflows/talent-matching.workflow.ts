import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

export const talentMatchingWorkflowId = "talent-matching-workflow" as const;

export const talentMatchingInputSchema = z.object({
  companyNeed: z.string(),
  talentProfile: z.string(),
});

export const talentMatchingOutputSchema = z.object({
  matchSummary: z.string(),
  score: z.number().int().min(0).max(100),
});

export function normalizeTalentMatching(
  companyNeed: string,
  talentProfile: string,
) {
  const score = Math.min(
    100,
    Math.max(
      0,
      Math.round((companyNeed.length + talentProfile.length) / 10),
    ),
  );

  return {
    matchSummary: "Talent and company need have been normalized for review.",
    score,
  };
}

const talentMatchingStep = createStep({
  id: "talent-matching-step",
  inputSchema: talentMatchingInputSchema,
  outputSchema: talentMatchingOutputSchema,
  execute: async ({ inputData }) =>
    normalizeTalentMatching(inputData.companyNeed, inputData.talentProfile),
});

export const talentMatchingWorkflow = createWorkflow({
  id: talentMatchingWorkflowId,
  inputSchema: talentMatchingInputSchema,
  outputSchema: talentMatchingOutputSchema,
})
  .then(talentMatchingStep)
  .commit();
