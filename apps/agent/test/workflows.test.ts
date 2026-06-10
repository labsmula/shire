import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeDisputeSummary,
  disputeSummaryOutputSchema,
  disputeSummaryWorkflow,
  disputeSummaryWorkflowId,
} from "../src/mastra/workflows/dispute-summary.workflow";
import {
  normalizeJobMatching,
  jobMatchingOutputSchema,
  jobMatchingWorkflow,
  jobMatchingWorkflowId,
} from "../src/mastra/workflows/job-matching.workflow";
import {
  normalizeParsedCv,
  parseCvOutputSchema,
  parseCvWorkflow,
  parseCvWorkflowId,
} from "../src/mastra/workflows/parse-cv.workflow";
import {
  normalizeTalentMatching,
  talentMatchingOutputSchema,
  talentMatchingWorkflow,
  talentMatchingWorkflowId,
} from "../src/mastra/workflows/talent-matching.workflow";

test("workflow ids stay stable", () => {
  assert.equal(parseCvWorkflow.id, parseCvWorkflowId);
  assert.equal(jobMatchingWorkflow.id, jobMatchingWorkflowId);
  assert.equal(talentMatchingWorkflow.id, talentMatchingWorkflowId);
  assert.equal(disputeSummaryWorkflow.id, disputeSummaryWorkflowId);
});

test("parse CV normalization keeps a bounded summary and deduped keywords", () => {
  const output = normalizeParsedCv("  Alpha Beta Beta! Gamma-1, Delta.  ");

  assert.deepEqual(parseCvOutputSchema.parse(output), {
    profileSummary: "Alpha Beta Beta! Gamma-1, Delta.",
    keywords: ["Alpha", "Beta", "Gamma-1", "Delta"],
  });
});

test("job matching normalization keeps the deterministic score contract", () => {
  const output = normalizeJobMatching("abc", "defg");

  assert.deepEqual(jobMatchingOutputSchema.parse(output), {
    matchSummary: "Candidate and job have been normalized for matching review.",
    score: 1,
  });
});

test("talent matching normalization clamps the deterministic score contract", () => {
  const output = normalizeTalentMatching("x".repeat(600), "x".repeat(600));

  assert.deepEqual(talentMatchingOutputSchema.parse(output), {
    matchSummary: "Talent and company need have been normalized for review.",
    score: 100,
  });
});

test("dispute summary normalization preserves the stable output shape", () => {
  const output = normalizeDisputeSummary(
    "  Ownership dispute  ",
    "  Evidence log copied from ticket #12345 with timestamps  ",
  );

  assert.deepEqual(disputeSummaryOutputSchema.parse(output), {
    summary:
      "Ownership dispute | Evidence: Evidence log copied from ticket #12345 with timestamps",
    recommendedAction:
      "Review evidence, confirm ownership, and resolve with a clear next action.",
  });
});
