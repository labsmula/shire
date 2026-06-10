import assert from "node:assert/strict";
import test from "node:test";

import {
  extractParsedCvText,
  interpretParsedCvProfile,
  normalizeParsedCvKeywords,
  parseCvOutputSchema,
  parseCvWorkflow,
  parseCvWorkflowId,
} from "../src/mastra/workflows/parse-cv.workflow";

test("parse CV extraction cleans raw text deterministically", () => {
  const output = extractParsedCvText("  Alpha\r\nBeta\tBeta!  \u0000Gamma  ");

  assert.deepEqual(output, {
    rawText: "Alpha Beta Beta! Gamma",
  });
});

test("parse CV normalization dedupes and bounds keywords", () => {
  const output = normalizeParsedCvKeywords({
    rawText:
      "Alpha Beta Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda",
  });

  assert.deepEqual(output, {
    rawText:
      "Alpha Beta Beta Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda",
    keywords: ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta"],
  });
});

test("parse CV interpretation returns the candidate profile summary shape", () => {
  const output = interpretParsedCvProfile({
    rawText: "Alpha Beta Beta Gamma Delta",
    keywords: ["Alpha", "Beta", "Gamma", "Delta"],
  });

  assert.deepEqual(parseCvOutputSchema.parse(output), {
    profileSummary: "Alpha Beta Beta Gamma Delta",
    keywords: ["Alpha", "Beta", "Gamma", "Delta"],
  });
});

test("parse CV workflow keeps its id and result shape stable", async () => {
  assert.equal(parseCvWorkflow.id, parseCvWorkflowId);

  const workflow = await parseCvWorkflow.createRun();
  const result = await workflow.start({
    inputData: {
      rawCv: "  Alpha\r\nBeta\tBeta!  Gamma  ",
    },
  });

  assert.equal(result.status, "success");
  assert.deepEqual(result.result, {
    profileSummary: "Alpha Beta Beta! Gamma",
    keywords: ["Alpha", "Beta", "Gamma"],
  });
});
