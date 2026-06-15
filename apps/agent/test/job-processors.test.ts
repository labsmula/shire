import assert from "node:assert/strict";
import test from "node:test";

import { createJobProcessors } from "../src/runtime/jobs/job-processors";

test("dispatches deterministic onchain jobs without an LLM", async () => {
  let llmCalls = 0;
  const processors = createJobProcessors({
    processCvParse: async () => {
      llmCalls += 1;
      throw new Error("not expected");
    },
  });

  const result = await processors.process(
    {
      id: "job-1",
      name: "onchain-sync",
      payload: { chain: "Celo" },
    },
    { attempt: 1, signal: new AbortController().signal },
  );

  assert.deepEqual(result, {
    status: "ready",
    chain: "Celo",
    llmInvoked: false,
  });
  assert.equal(llmCalls, 0);
});
