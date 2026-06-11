import assert from "node:assert/strict";
import test from "node:test";

import { createAgentMemoryConfig } from "../src/runtime/memory";

test("memory remains bounded and uses the configured libSQL store", () => {
  const config = createAgentMemoryConfig({
    agentMemoryUrl: "file:./.data/test-memory.db",
  });

  assert.equal(config.options.lastMessages, 10);
  assert.equal(config.options.workingMemory.enabled, true);
  assert.equal(config.options.generateTitle, false);
});
