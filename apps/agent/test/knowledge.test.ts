import assert from "node:assert/strict";
import test from "node:test";

import {
  buildKnowledgeSystemMessage,
  limitKnowledgeResults,
} from "../src/runtime/knowledge";
import {
  knowledgeSources,
  productKnowledgeSources,
  repositoryKnowledgeSources,
} from "../src/runtime/knowledge-sources";

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

test("registers general, candidate, and recruiter product knowledge", () => {
  assert.deepEqual(
    productKnowledgeSources.map((source) => source.audience),
    ["general", "candidate", "recruiter"],
  );
  assert.deepEqual(
    productKnowledgeSources.map((source) => source.corpus),
    ["product", "product", "product"],
  );
  assert.equal(
    productKnowledgeSources.every((source) =>
      source.path.startsWith(".agent/knowledge/product/"),
    ),
    true,
  );
});

test("keeps repository and product knowledge explicitly separated", () => {
  assert.equal(
    repositoryKnowledgeSources.every(
      (source) => source.corpus === "repository",
    ),
    true,
  );
  assert.equal(
    knowledgeSources.length,
    repositoryKnowledgeSources.length + productKnowledgeSources.length,
  );
});
