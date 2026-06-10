import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

export const parseCvWorkflowId = "parse-cv-workflow" as const;

export const parseCvInputSchema = z.object({
  rawCv: z.string(),
});

export const parseCvOutputSchema = z.object({
  profileSummary: z.string(),
  keywords: z.array(z.string()).max(8),
});

export function normalizeParsedCv(rawCv: string) {
  const cleanText = rawCv.trim();
  const keywords = Array.from(
    new Set(
      cleanText
        .split(/\s+/)
        .map((word) => word.replace(/[^a-zA-Z0-9-]/g, ""))
        .filter(Boolean)
        .slice(0, 8),
    ),
  );

  return {
    profileSummary: cleanText.slice(0, 240),
    keywords,
  };
}

const parseCvStep = createStep({
  id: "parse-cv-step",
  inputSchema: parseCvInputSchema,
  outputSchema: parseCvOutputSchema,
  execute: async ({ inputData }) => normalizeParsedCv(inputData.rawCv),
});

export const parseCvWorkflow = createWorkflow({
  id: parseCvWorkflowId,
  inputSchema: parseCvInputSchema,
  outputSchema: parseCvOutputSchema,
})
  .then(parseCvStep)
  .commit();
