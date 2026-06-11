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
- `SHIRE_EMBEDDING_MODEL`: direct OpenAI embedding model

Provider credentials use `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, and
`ZAI_API_KEY`. Free OpenRouter availability changes over time, so model IDs are
environment configuration rather than business logic.

Memory and repository knowledge use separate libSQL URLs. Retrieval defaults to
five results and an 8,000-character context budget; configure these with
`SHIRE_AGENT_MEMORY_URL`, `SHIRE_AGENT_KNOWLEDGE_URL`,
`SHIRE_AGENT_KNOWLEDGE_INDEX`, `SHIRE_RAG_TOP_K`, and
`SHIRE_RAG_MAX_CHARACTERS`.

## Runtime policy

Routine CV extraction, workflow summaries, and reduced-set reranking start on
the `cheap` chain: OpenRouter, then Z.AI, then OpenAI mini. Ambiguous structured
work may escalate to `balanced`. Dispute summaries start on `heavy`: strong
OpenAI, then strong Z.AI.

CV extraction produces a Zod-validated draft. Embedding is a separate direct
OpenAI call over canonical profile search text. Raw CV text and full evidence
files are excluded from memory.

Run `npm run job:knowledge-sync --workspace=@shire/agent` to index the approved
repository manifest. Job results expose routing metadata plus normalized model,
provider, token, latency, retry, and escalation fields.
