import assert from "node:assert/strict";
import test from "node:test";

import { parseJobRequest } from "../src/runtime/jobs/job-contracts";

test("parses a valid cv parse payload", () => {
  assert.deepEqual(
    parseJobRequest({
      name: "cv-parse",
      payload: {
        candidateId: "candidate-001",
        rawCv: "Senior TypeScript engineer",
      },
    }),
    {
      name: "cv-parse",
      payload: {
        candidateId: "candidate-001",
        rawCv: "Senior TypeScript engineer",
      },
    },
  );
});

test("rejects an empty CV", () => {
  assert.throws(() =>
    parseJobRequest({
      name: "cv-parse",
      payload: { candidateId: "candidate-001", rawCv: "" },
    }),
  );
});

test("rejects unknown jobs", () => {
  assert.throws(() => parseJobRequest({ name: "unknown", payload: {} }));
});
