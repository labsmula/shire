# Shire Agent Memory and RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `apps/agent` persistent thread memory and a retrievable knowledge base sourced from `.agent/context` so agent outputs stay grounded in Shire-specific requirements instead of local-only fixtures.

**Architecture:** Keep memory and retrieval as separate primitives. Use Mastra `Memory` with libSQL storage for thread/resource state, and use a separate libSQL vector index for `.agent/context` markdown knowledge. The runtime should prefetch or expose relevant knowledge explicitly, not rely on the model to “remember” repository rules. `.agent/context` remains the source of truth, and the agent runtime only consumes it through a documented ingestion path.

**Tech Stack:** TypeScript, npm workspaces, Mastra, `@mastra/memory`, `@mastra/libsql`, `@mastra/rag`, `ai`, `zod`, `node:test`, `tsx`, libSQL vector storage, Markdown ingestion.

---

### Task 1: Lock the memory and RAG config contract in env and docs

**Files:**
- Modify: `.agent/context/agent/runtime-context.md`
- Modify: `.agent/context/agent/README.md`
- Modify: `apps/agent/src/env.ts`
- Modify: `apps/agent/.env.example`
- Modify: `apps/agent/README.md`
- Modify: `apps/agent/test/env.test.ts`
- Modify: `apps/agent/package.json`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createEnv } from "../src/env";

test("defaults memory and rag config for local development", () => {
  const env = createEnv({});

  assert.equal(env.agentMemoryUrl, "file:./.data/shire-agent-memory.db");
  assert.equal(env.agentKnowledgeUrl, "file:./.data/shire-agent-knowledge.db");
  assert.equal(env.agentKnowledgeIndex, "shire-context");
  assert.equal(env.embeddingModel, "openai/text-embedding-3-small");
});
```

- [ ] **Step 2: Run the isolated test to verify it fails**

Run: `node --import tsx --test apps/agent/test/env.test.ts`
Expected: FAIL because the new memory and knowledge config fields do not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
export function createEnv(input: NodeJS.ProcessEnv = process.env) {
  const nodeEnv = input.NODE_ENV ?? "development";

  return {
    nodeEnv,
    port: Number(input.PORT ?? 3010),
    autonomyMode: parseAutonomyMode(input.SHIRE_AUTONOMY_MODE),
    logLevel: input.SHIRE_LOG_LEVEL?.trim() || (nodeEnv === "development" ? "debug" : "info"),
    prettyLogs: parseBoolean(input.SHIRE_PRETTY_LOGS, nodeEnv !== "production"),
    model: input.SHIRE_MODEL?.trim() || "openai/gpt-4.1-mini",
    openAiApiKey: input.OPENAI_API_KEY?.trim() || undefined,
    agentMemoryUrl: input.SHIRE_AGENT_MEMORY_URL?.trim() || "file:./.data/shire-agent-memory.db",
    agentKnowledgeUrl: input.SHIRE_AGENT_KNOWLEDGE_URL?.trim() || "file:./.data/shire-agent-knowledge.db",
    agentKnowledgeIndex: input.SHIRE_AGENT_KNOWLEDGE_INDEX?.trim() || "shire-context",
    embeddingModel: input.SHIRE_EMBEDDING_MODEL?.trim() || "openai/text-embedding-3-small",
  } as const;
}
```

```md
## Agent Memory and RAG

The current runtime uses explicit memory and retrieval layers.

- `apps/agent/src/runtime/memory.ts` owns thread/resource memory wiring.
- `apps/agent/src/runtime/knowledge-sources.ts` owns the ordered `.agent/context` corpus.
- `apps/agent/src/runtime/knowledge.ts` owns chunking, embeddings, and retrieval.
- `apps/agent/src/runtime/agent-runner.ts` injects retrieved context into agent calls.

Do not treat `.agent/tasks/` or `.agent/archive/` as knowledge sources by default.
```

- [ ] **Step 4: Run the isolated test to verify it passes**

Run: `node --import tsx --test apps/agent/test/env.test.ts`
Expected: PASS with the new config fields present and defaulted.

- [ ] **Step 5: Commit**

```bash
git add .agent/context/agent/runtime-context.md .agent/context/agent/README.md apps/agent/src/env.ts apps/agent/.env.example apps/agent/README.md apps/agent/test/env.test.ts apps/agent/package.json
git commit -m "feat(agent): define memory and rag config"
```

### Task 2: Add persistent agent memory

**Files:**
- Create: `apps/agent/src/runtime/memory.ts`
- Modify: `apps/agent/src/mastra/agents/cv-profile.agent.ts`
- Modify: `apps/agent/src/mastra/agents/job-matching.agent.ts`
- Modify: `apps/agent/src/mastra/agents/talent-matching.agent.ts`
- Modify: `apps/agent/src/mastra/agents/dispute-summary.agent.ts`
- Create: `apps/agent/test/memory.test.ts`
- Modify: `apps/agent/src/mastra/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createAgentMemoryConfig } from "../src/runtime/memory";

test("createAgentMemoryConfig binds the libsql url and working memory", () => {
  const config = createAgentMemoryConfig({
    agentMemoryUrl: "file:./.data/shire-agent-memory.db",
  });

  assert.equal(config.storage.url, "file:./.data/shire-agent-memory.db");
  assert.equal(config.options?.workingMemory?.enabled, true);
});
```

- [ ] **Step 2: Run the isolated test to verify it fails**

Run: `node --import tsx --test apps/agent/test/memory.test.ts`
Expected: FAIL because `createAgentMemoryConfig` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";

export function createAgentMemoryConfig(input: { agentMemoryUrl: string }) {
  return {
    storage: new LibSQLStore({
      id: "shire-agent-memory",
      url: input.agentMemoryUrl,
    }),
    options: {
      workingMemory: {
        enabled: true,
      },
    },
  };
}

export function createAgentMemory(input: { agentMemoryUrl: string }) {
  return new Memory(createAgentMemoryConfig(input));
}
```

```ts
import { env } from "../../env";
import { createAgentMemory } from "../../runtime/memory";

export const cvProfileAgent = new Agent({
  id: "cv-profile-agent",
  name: "CV Profile Agent",
  instructions: "...",
  model: agentModel,
  memory: createAgentMemory(env),
  tools: { ... },
});
```

- [ ] **Step 4: Run the isolated test to verify it passes**

Run: `node --import tsx --test apps/agent/test/memory.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/runtime/memory.ts apps/agent/src/mastra/agents apps/agent/src/mastra/index.ts apps/agent/test/memory.test.ts
git commit -m "feat(agent): add persistent memory"
```

### Task 3: Build the knowledge corpus and sync job from `.agent/context`

**Files:**
- Create: `apps/agent/src/runtime/knowledge-sources.ts`
- Create: `apps/agent/src/runtime/knowledge.ts`
- Create: `apps/agent/src/jobs/run-knowledge-sync.ts`
- Modify: `apps/agent/src/runtime/job-registry.ts`
- Modify: `apps/agent/package.json`
- Create: `apps/agent/test/knowledge.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { knowledgeSources } from "../src/runtime/knowledge-sources";

test("knowledge sources keep architecture and agent docs ahead of archive docs", () => {
  assert.deepEqual(
    knowledgeSources.map((entry) => entry.path),
    [
      ".agent/context/architecture.md",
      ".agent/context/agent/orchestration.md",
      ".agent/context/agent/runtime-context.md",
      ".agent/context/agent/workflows.md",
      ".agent/context/agent/matching-pipeline.md",
      ".agent/context/agent/api.md",
      ".agent/context/auth/README.md",
      ".agent/context/schemas/README.md",
      ".agent/context/onchain/README.md",
      ".agent/decisions/log.md",
    ],
  );
});
```

- [ ] **Step 2: Run the isolated test to verify it fails**

Run: `node --import tsx --test apps/agent/test/knowledge.test.ts`
Expected: FAIL because the explicit corpus manifest does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
export const knowledgeSources = [
  { path: ".agent/context/architecture.md", priority: 0 },
  { path: ".agent/context/agent/orchestration.md", priority: 1 },
  { path: ".agent/context/agent/runtime-context.md", priority: 2 },
  { path: ".agent/context/agent/workflows.md", priority: 3 },
  { path: ".agent/context/agent/matching-pipeline.md", priority: 4 },
  { path: ".agent/context/agent/api.md", priority: 5 },
  { path: ".agent/context/auth/README.md", priority: 6 },
  { path: ".agent/context/schemas/README.md", priority: 7 },
  { path: ".agent/context/onchain/README.md", priority: 8 },
  { path: ".agent/decisions/log.md", priority: 9 },
] as const;
```

```ts
import { MDocument } from "@mastra/rag";
import { embed, embedMany } from "ai";
import { LibSQLVector } from "@mastra/core/vector/libsql";

export async function syncKnowledgeBase(input: {
  vectorUrl: string;
  indexName: string;
  embeddingModel: string;
  documents: Array<{ path: string; content: string; priority: number }>;
}) {
  const vectorStore = new LibSQLVector({
    id: "shire-agent-knowledge",
    url: input.vectorUrl,
  });

  await vectorStore.createIndex({
    indexName: input.indexName,
    dimension: 1536,
  });

  for (const document of input.documents) {
    const chunks = await MDocument.fromText(document.content).chunk({
      strategy: "recursive",
      size: 512,
      overlap: 50,
    });

    const { embeddings } = await embedMany({
      model: input.embeddingModel,
      values: chunks.map((chunk) => chunk.text),
    });

    await vectorStore.upsert({
      indexName: input.indexName,
      vectors: embeddings,
      metadata: chunks.map((chunk) => ({
        path: document.path,
        priority: document.priority,
        text: chunk.text,
      })),
    });
  }
}

export async function searchKnowledge(input: {
  vectorUrl: string;
  indexName: string;
  embeddingModel: string;
  query: string;
  topK: number;
}) {
  const vectorStore = new LibSQLVector({
    id: "shire-agent-knowledge",
    url: input.vectorUrl,
  });

  const { embedding } = await embed({
    value: input.query,
    model: input.embeddingModel,
  });

  return vectorStore.query({
    indexName: input.indexName,
    queryVector: embedding,
    topK: input.topK,
  });
}

export function buildKnowledgeSystemMessage(results: Array<{ path: string; text: string }>) {
  if (results.length === 0) {
    return "No indexed Shire context was found for this request.";
  }

  return [
    "Relevant Shire context:",
    ...results.map((result) => `- ${result.path}: ${result.text}`),
  ].join("\n");
}
```

```json
{
  "scripts": {
    "job:knowledge-sync": "node --import tsx src/jobs/run-knowledge-sync.ts"
  }
}
```

- [ ] **Step 4: Run the isolated test to verify it passes**

Run: `node --import tsx --test apps/agent/test/knowledge.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/runtime/knowledge-sources.ts apps/agent/src/runtime/knowledge.ts apps/agent/src/jobs/run-knowledge-sync.ts apps/agent/src/runtime/job-registry.ts apps/agent/package.json apps/agent/test/knowledge.test.ts
git commit -m "feat(agent): add knowledge sync pipeline"
```

### Task 4: Expose retrieval to the agents and wire memory-aware execution

**Files:**
- Create: `apps/agent/src/runtime/agent-runner.ts`
- Create: `apps/agent/src/mastra/tools/knowledge.tools.ts`
- Modify: `apps/agent/src/mastra/agents/cv-profile.agent.ts`
- Modify: `apps/agent/src/mastra/agents/job-matching.agent.ts`
- Modify: `apps/agent/src/mastra/agents/talent-matching.agent.ts`
- Modify: `apps/agent/src/mastra/agents/dispute-summary.agent.ts`
- Modify: `apps/agent/src/mastra/index.ts`
- Create: `apps/agent/test/agent-runner.test.ts`
- Modify: `apps/agent/test/tools.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { runAgentWithMemoryAndKnowledge } from "../src/runtime/agent-runner";

test("runAgentWithMemoryAndKnowledge forwards thread and resource ids", async () => {
  const calls: unknown[] = [];
  const fakeAgent = {
    generate: async (_messages: unknown, options: unknown) => {
      calls.push(options);
      return { text: "ok" };
    },
  };

  await runAgentWithMemoryAndKnowledge({
    agent: fakeAgent,
    threadId: "thread-1",
    resourceId: "user-1",
    query: "matching pipeline",
    messages: [{ role: "user", content: "Explain the current matching pipeline." }],
  });

  assert.equal((calls[0] as { memory: { thread: string; resource: string } }).memory.thread, "thread-1");
  assert.equal((calls[0] as { memory: { thread: string; resource: string } }).memory.resource, "user-1");
});
```

- [ ] **Step 2: Run the isolated test to verify it fails**

Run: `node --import tsx --test apps/agent/test/agent-runner.test.ts`
Expected: FAIL because the runner does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
export async function runAgentWithMemoryAndKnowledge(input: {
  agent: { generate: (messages: unknown, options?: unknown) => Promise<unknown> };
  threadId: string;
  resourceId: string;
  query: string;
  messages: Array<{ role: "user" | "system" | "assistant"; content: string }>;
}) {
  const knowledge = input.query
    ? await searchKnowledge({
        vectorUrl: "file:./.data/shire-agent-knowledge.db",
        indexName: "shire-context",
        embeddingModel: "openai/text-embedding-3-small",
        query: input.query,
        topK: 5,
      })
    : [];
  const systemMessage = buildKnowledgeSystemMessage(knowledge);

  return input.agent.generate(
    [
      { role: "system", content: systemMessage },
      ...input.messages,
    ],
    {
      memory: {
        thread: input.threadId,
        resource: input.resourceId,
      },
    },
  );
}
```

```ts
export const knowledgeContextTool = createTool({
  id: "knowledge-context-tool",
  description: "Retrieve the most relevant Shire context snippets from the indexed .agent corpus.",
  inputSchema: z.object({
    query: z.string().min(1),
    topK: z.number().int().min(1).max(10).default(5),
  }),
  outputSchema: z.object({
    query: z.string(),
    results: z.array(
      z.object({
        path: z.string(),
        text: z.string(),
        score: z.number().optional(),
      }),
    ),
  }),
  execute: async ({ inputData }) =>
    searchKnowledge({
      vectorUrl: "file:./.data/shire-agent-knowledge.db",
      indexName: "shire-context",
      embeddingModel: "openai/text-embedding-3-small",
      query: inputData.query,
      topK: inputData.topK,
    }),
});
```

```ts
export const cvProfileAgent = new Agent({
  id: "cv-profile-agent",
  name: "CV Profile Agent",
  instructions: "...",
  model: agentModel,
  memory: createAgentMemory(env),
  tools: {
    userContextTool,
    candidateContextTool,
    evidenceContextTool,
    knowledgeContextTool,
  },
});
```

- [ ] **Step 4: Run the isolated test to verify it passes**

Run: `node --import tsx --test apps/agent/test/agent-runner.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/runtime/agent-runner.ts apps/agent/src/mastra/tools/knowledge.tools.ts apps/agent/src/mastra/agents apps/agent/src/mastra/index.ts apps/agent/test/agent-runner.test.ts apps/agent/test/tools.test.ts
git commit -m "feat(agent): wire memory and knowledge retrieval"
```

### Task 5: Verify the end state and refresh repo-facing docs

**Files:**
- Review: `apps/agent/src/runtime/memory.ts`
- Review: `apps/agent/src/runtime/knowledge.ts`
- Review: `apps/agent/src/runtime/agent-runner.ts`
- Review: `apps/agent/src/mastra/index.ts`
- Review: `apps/agent/src/mastra/tools/knowledge.tools.ts`
- Review: `.agent/context/agent/runtime-context.md`
- Review: `apps/agent/README.md`

- [ ] **Step 1: Run the agent tests**

Run: `npm run test --workspace=@shire/agent`
Expected: PASS.

- [ ] **Step 2: Run the agent build**

Run: `npm run build --workspace=@shire/agent`
Expected: PASS.

- [ ] **Step 3: Seed the knowledge index**

Run: `npm run job:knowledge-sync --workspace=@shire/agent`
Expected: The sync job indexes the explicit `.agent/context` corpus into the configured libSQL vector store.

- [ ] **Step 4: Run the agent runtime**

Run: `npm run dev --workspace=@shire/agent`
Expected: The runtime starts, keeps listening, and can resolve `/health` while memory and knowledge configuration are present.

- [ ] **Step 5: Commit the finished state**

```bash
git add apps/agent .agent/context docs/superpowers/plans/2026-06-11-agent-memory-rag-plan.md package-lock.json
git commit -m "feat(agent): add memory and rag runtime"
```
