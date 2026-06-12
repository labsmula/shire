import assert from "node:assert/strict";
import test from "node:test";

import {
  buildKnowledgeFilter,
  buildKnowledgeSystemMessage,
  limitKnowledgeResults,
  searchProductKnowledge,
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

test("builds repository and role-aware product filters", () => {
  assert.deepEqual(buildKnowledgeFilter({ corpus: "repository" }), {
    corpus: "repository",
  });
  assert.deepEqual(
    buildKnowledgeFilter({ corpus: "product", role: "candidate" }),
    {
      corpus: "product",
      audience: { $in: ["general", "candidate"] },
    },
  );
  assert.deepEqual(
    buildKnowledgeFilter({ corpus: "product", role: "recruiter" }),
    {
      corpus: "product",
      audience: { $in: ["general", "recruiter"] },
    },
  );
});

test("product retrieval passes the role filter before ranking", async () => {
  let receivedFilter: unknown;

  const results = await searchProductKnowledge(
    "How does staking work?",
    "candidate",
    {
      indexes: ["shire-context"],
      embed: async () => ({ embedding: [0.1, 0.2] }),
      query: async (input) => {
        receivedFilter = input.filter;
        return [
          {
            score: 0.9,
            metadata: {
              path: ".agent/knowledge/product/shire-candidate.md",
              text: "Candidate staking requires wallet approval.",
            },
          },
        ];
      },
    },
  );

  assert.deepEqual(receivedFilter, {
    corpus: "product",
    audience: { $in: ["general", "candidate"] },
  });
  assert.equal(
    results[0]?.path,
    ".agent/knowledge/product/shire-candidate.md",
  );
});

test("product retrieval falls back to local role-filtered documents", async () => {
  const results = await searchProductKnowledge(
    "How does staking work?",
    "candidate",
    {
      indexes: [],
      embed: async () => {
        throw new Error("embedding should not run");
      },
      query: async () => {
        throw new Error("vector query should not run");
      },
      localDocuments: [
        {
          audience: "general",
          path: ".agent/knowledge/product/shire-general.md",
          text: "Shire uses escrow staking for applications.",
        },
        {
          audience: "candidate",
          path: ".agent/knowledge/product/shire-candidate.md",
          text: "Candidates approve staking in their wallet.",
        },
        {
          audience: "recruiter",
          path: ".agent/knowledge/product/shire-recruiter.md",
          text: "Recruiters manage company staking.",
        },
      ],
    },
  );

  assert.deepEqual(
    results.map((result) => result.path),
    [
      ".agent/knowledge/product/shire-general.md",
      ".agent/knowledge/product/shire-candidate.md",
    ],
  );
});
