import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

const parseCvStep = createStep({
  id: "parse-cv-step",
  inputSchema: z.object({
    rawCv: z.string(),
  }),
  outputSchema: z.object({
    profileSummary: z.string(),
    keywords: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const cleanText = inputData.rawCv.trim();
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
  },
});

export const parseCvWorkflow = createWorkflow({
  id: "parse-cv-workflow",
  inputSchema: z.object({
    rawCv: z.string(),
  }),
  outputSchema: z.object({
    profileSummary: z.string(),
    keywords: z.array(z.string()),
  }),
})
  .then(parseCvStep)
  .commit();
