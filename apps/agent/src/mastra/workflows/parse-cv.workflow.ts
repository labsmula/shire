import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

export const parseCvWorkflowId = "parse-cv-workflow" as const;

export const parseCvInputSchema = z.object({
  rawCv: z.string(),
});

export const parseCvExtractionOutputSchema = z.object({
  rawText: z.string(),
});

export const parseCvNormalizationOutputSchema = z.object({
  rawText: z.string(),
  keywords: z.array(z.string()).max(8),
});

export const parseCvOutputSchema = z.object({
  profileSummary: z.string(),
  keywords: z.array(z.string()).max(8),
});

export function extractParsedCvText(rawCv: string) {
  const rawText = rawCv
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    rawText,
  };
}

export function normalizeParsedCvKeywords({
  rawText,
}: z.infer<typeof parseCvExtractionOutputSchema>) {
  const keywords = Array.from(
    new Set(
      rawText
        .split(/\s+/)
        .map((word) => word.replace(/[^a-zA-Z0-9-]/g, ""))
        .filter(Boolean),
    ),
  ).slice(0, 8);

  return {
    rawText,
    keywords,
  };
}

export function interpretParsedCvProfile({
  rawText,
  keywords,
}: z.infer<typeof parseCvNormalizationOutputSchema>) {
  return {
    profileSummary: rawText.slice(0, 240),
    keywords,
  };
}

export function normalizeParsedCv(rawCv: string) {
  return interpretParsedCvProfile(
    normalizeParsedCvKeywords(extractParsedCvText(rawCv)),
  );
}

const parseCvExtractStep = createStep({
  id: "parse-cv-extract-step",
  inputSchema: parseCvInputSchema,
  outputSchema: parseCvExtractionOutputSchema,
  execute: async ({ inputData }) => extractParsedCvText(inputData.rawCv),
});

const parseCvNormalizeStep = createStep({
  id: "parse-cv-normalize-step",
  inputSchema: parseCvExtractionOutputSchema,
  outputSchema: parseCvNormalizationOutputSchema,
  execute: async ({ inputData }) => normalizeParsedCvKeywords(inputData),
});

const parseCvInterpretStep = createStep({
  id: "parse-cv-interpret-step",
  inputSchema: parseCvNormalizationOutputSchema,
  outputSchema: parseCvOutputSchema,
  execute: async ({ inputData }) => interpretParsedCvProfile(inputData),
});

export const parseCvWorkflow = createWorkflow({
  id: parseCvWorkflowId,
  inputSchema: parseCvInputSchema,
  outputSchema: parseCvOutputSchema,
})
  .then(parseCvExtractStep)
  .then(parseCvNormalizeStep)
  .then(parseCvInterpretStep)
  .commit();
