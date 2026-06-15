# `apps/agent`

Background orchestration service for Shire.

## Structure
- `src/mastra/agents/` contains domain agents
- `src/mastra/workflows/` contains workflow definitions
- `src/mastra/tools/` contains reusable orchestration tools
- `src/jobs/` contains runnable background job entrypoints
- `src/server.ts` is the local runtime entrypoint
- `src/env.ts` centralizes runtime environment access

## Cost-aware configuration

Language models are configured as comma-separated fallback chains:

- `SHIRE_MODEL_CHEAP`: routine extraction, summaries, and reranking
- `SHIRE_MODEL_BALANCED`: ambiguous or repeatedly invalid structured output
- `SHIRE_MODEL_HEAVY`: dispute and conflicting-evidence analysis
- `SHIRE_EMBEDDING_MODEL`: OpenRouter embedding model
- `SHIRE_EMBEDDING_BASE_URL`: OpenRouter API root
- `SHIRE_EMBEDDING_ENABLED`: enable semantic memory and vector retrieval
- `SHIRE_WORKING_MEMORY_ENABLED`: enable tool-based persistent working memory

Chat and embeddings use `OPENROUTER_API_KEY`. Embeddings default to
`qwen/qwen3-embedding-8b` through OpenRouter's embeddings endpoint. Working
memory remains disabled because OpenRouter's free chat router may not select
models that support tool calls; recent conversation history and semantic recall
remain enabled.

Memory and repository knowledge use separate libSQL URLs. Retrieval defaults to
five results and an 8,000-character context budget; configure these with
`SHIRE_AGENT_MEMORY_URL`, `SHIRE_AGENT_KNOWLEDGE_URL`,
`SHIRE_AGENT_KNOWLEDGE_INDEX`, `SHIRE_RAG_TOP_K`, and
`SHIRE_RAG_MAX_CHARACTERS`.

## Runtime policy

All chat tiers default to verified, explicit OpenRouter free models instead of
the dynamic free router. This avoids transient routing to broken provider
endpoints. Override individual tiers with comma-separated fallback chains when
a workload needs stronger or more reliable models.

CV extraction produces a Zod-validated draft. Embedding is a separate
TokenRouter request resolved by Mastra over canonical profile search text. Raw
CV text and full evidence files are excluded from memory.

## Background worker

The runtime starts a persistent in-memory worker by default. This is the
queue-neutral validation phase before Redis and BullMQ are introduced.

Start the service:

```bash
npm run dev --workspace=@shire/agent
```

Submit a deterministic job:

```http
POST http://localhost:3010/jobs
Content-Type: application/json

{
  "name": "onchain-sync",
  "payload": {
    "chain": "Celo"
  }
}
```

Submit an LLM-backed CV job:

```http
POST http://localhost:3010/jobs
Content-Type: application/json

{
  "name": "cv-parse",
  "payload": {
    "candidateId": "candidate-001",
    "rawCv": "Maya Okafor. Senior frontend engineer with TypeScript and React experience."
  }
}
```

Both requests return `202` with a `jobId`. Poll:

```http
GET http://localhost:3010/jobs/{jobId}
```

The status transitions through `queued`, `active`, then `completed` or
`failed`. `onchain-sync` returns `llmInvoked: false`; `cv-parse` returns
`llmInvoked: true`, model usage, and embedding dimensions after successful
provider calls.

Run the CV CLI path directly:

```bash
npm run job:cv-parse --workspace=@shire/agent
```

This command now uses the real CV processor. It requires a valid
`OPENROUTER_API_KEY` and fails instead of reporting fixture usage when the LLM
or embedding provider is unavailable.

The live worker test is opt-in:

```powershell
$env:SHIRE_LIVE_LLM_TESTS="true"
node --env-file-if-exists=.env --import tsx --test test/live-cv-worker.test.ts
```

Keep `SHIRE_LIVE_LLM_TESTS=false` in normal unit-test runs. A `401` indicates a
missing or invalid provider key; `402` or `429` indicates provider credit or
rate limiting; structured-output failures indicate the selected model could not
produce the candidate schema.

Run `npm run job:knowledge-sync --workspace=@shire/agent` to index the approved
repository manifest. Job results expose routing metadata plus normalized model,
provider, token, latency, retry, and escalation fields.

## Product knowledge

The role-aware chat assistant uses curated product documents:

- `.agent/knowledge/product/shire-general.md`
- `.agent/knowledge/product/shire-candidate.md`
- `.agent/knowledge/product/shire-recruiter.md`

Synchronize the vector index after changing these files:

```bash
npm run dev --workspace=@shire/agent -- knowledge-sync
```

Candidate chat retrieves `general + candidate` chunks. Recruiter chat retrieves
`general + recruiter` chunks. The prompt-injection and out-of-scope guard runs
before retrieval.

When the vector index is available, product retrieval uses the configured
embedding provider. If the index is missing, chat falls back to deterministic
role-filtered retrieval from the curated local Markdown files. If retrieval
still fails, chat continues without product chunks and the agent must not invent
unavailable product behavior.
