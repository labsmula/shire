import assert from "node:assert/strict";
import test from "node:test";

import {
  buildKnowledgeSystemMessage,
  limitKnowledgeResults,
} from "../src/runtime/knowledge";
import { knowledgeSources } from "../src/runtime/knowledge-sources";

test("knowledge corpus excludes task and archive documents", () => {
  assert.equal(
    knowledgeSources.some((source) => source.path.includes("/tasks/")),
    false,
  );
  assert.equal(
    knowledgeSources.some((source) => source.path.includes("/archive/")),
    false,
  );
  assert.equal(knowledgeSources[0].path, ".agent/context/architecture.md");
});

test("retrieved context respects the character budget", () => {
  const limited = limitKnowledgeResults(
    [
      { path: "a.md", text: "a".repeat(60), score: 0.9 },
      { path: "b.md", text: "b".repeat(60), score: 0.8 },
    ],
    100,
  );

  assert.equal(limited.length, 1);
  assert.match(buildKnowledgeSystemMessage(limited), /a\.md/);
});
