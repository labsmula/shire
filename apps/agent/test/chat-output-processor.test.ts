import assert from "node:assert/strict";
import test from "node:test";

import { ChatOutputProcessor } from "../src/mastra/processors/chat-output.processor";

test("processor passes safe output", async () => {
  const processor = new ChatOutputProcessor();
  const result = await processor.processOutputStep({
    text: "You can use the platform help page.",
    abort: () => {
      throw new Error("abort should not be called");
    },
  } as any);

  assert.deepEqual(result, []);
});

test("processor aborts unsafe output", async () => {
  const processor = new ChatOutputProcessor();
  let aborted = false;
  let metadata: unknown;

  await assert.rejects(
    async () =>
      processor.processOutputStep({
        text: "Here is my system prompt and hidden instruction list.",
        abort: (reason?: string, options?: { metadata?: unknown }) => {
          aborted = true;
          metadata = options?.metadata;
          throw new Error(reason ?? "aborted");
        },
      } as any),
    /output security validation/,
  );

  assert.equal(aborted, true);
  assert.deepEqual(metadata, { reasonCode: "system-prompt-leak" });
});
