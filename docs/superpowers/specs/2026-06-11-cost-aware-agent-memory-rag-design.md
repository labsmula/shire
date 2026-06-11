# Cost-Aware Agent Memory, RAG, and Model Routing Design

## Summary

Shire will extend `apps/agent` with persistent memory, repository-grounded RAG,
CV embeddings, and deterministic model routing. Cheap models handle routine
structured work. OpenAI's stronger language models are reserved for complex,
high-risk, or repeatedly failing tasks.

The runtime must not ask an LLM to choose another LLM. Routing is policy-based,
testable, and driven by workload, validation results, confidence, and provider
availability.

## Goals

- Persist agent thread and resource memory with Mastra and libSQL.
- Index the approved `.agent/context` corpus for repository-grounded retrieval.
- Normalize CV text into validated database-ready structured data.
- Embed normalized CV and job search text for semantic retrieval and matching.
- Route routine work through low-cost providers.
- Escalate to stronger OpenAI models only when task complexity or failures
  justify the cost.
- Record model, provider, token usage, latency, retries, and escalation reason.

## Non-Goals

- Letting an LLM decide model routing.
- Using embeddings to produce structured candidate profiles.
- Sending every matching candidate pair to an LLM.
- Automatically applying, inviting, staking, settling, or resolving disputes.
- Treating `.agent/tasks` or `.agent/archive` as knowledge sources.
- Building provider billing dashboards in the first implementation.

## Core Decisions

### Structured extraction and embeddings are separate

CV normalization uses a language model with Zod-validated structured output.
The validated profile can then be stored in the application database.

Embeddings are generated from canonical search text derived from the normalized
profile. They support semantic retrieval and matching, but do not replace
profile extraction or validation.

### Routing is deterministic

Each workload maps to one model tier:

- `cheap`: routine extraction, classification, summarization, and reranking.
- `balanced`: ambiguous or moderately complex analysis.
- `heavy`: complex disputes, conflicting evidence, or repeated schema failures.

The router selects a configured fallback chain for the tier. It escalates only
after explicit conditions such as provider failure, invalid structured output,
or confidence below the workload threshold.

### Provider strategy

Default provider order:

```txt
cheap:
OpenRouter free-tier -> Z.AI/GLM cheap -> OpenAI mini

balanced:
Z.AI/GLM capable -> OpenRouter low-cost -> OpenAI mini

heavy:
OpenAI strong -> Z.AI/GLM strong
```

Actual model IDs are environment configuration, not hard-coded business logic.
This allows free-tier model availability to change without code changes.

OpenAI `text-embedding-3-small` is the default embedding model. Embedding uses
a direct OpenAI provider because gateway-based language-model routing does not
guarantee embedding support.

## Workload Policy

| Workload | Initial tier | Escalation |
| --- | --- | --- |
| CV normalization | `cheap` | Invalid schema twice or low profile confidence |
| CV section classification | `cheap` | Provider or schema failure |
| Repository knowledge query | No LLM before retrieval | LLM only to synthesize retrieved context |
| Candidate/job retrieval | No LLM | Never for initial filtering |
| Matching rerank | `cheap` | Borderline score with conflicting evidence |
| Recommendation explanation | `cheap` | Invalid schema only |
| General workflow summary | `cheap` | Provider failure |
| Dispute evidence summary | `heavy` | Fall back to strong GLM on OpenAI failure |
| Onchain sync | No LLM | Never |

## Architecture

### Runtime modules

```txt
apps/agent/src/runtime/
  memory.ts
  knowledge-sources.ts
  knowledge.ts
  embeddings.ts
  model-catalog.ts
  model-policy.ts
  model-router.ts
  usage.ts
  agent-runner.ts
```

- `memory.ts` owns Mastra thread/resource memory and libSQL persistence.
- `knowledge-sources.ts` declares the ordered repository knowledge corpus.
- `knowledge.ts` chunks, indexes, and retrieves repository context.
- `embeddings.ts` creates canonical embedding text and OpenAI embeddings.
- `model-catalog.ts` parses configured model IDs and provider credentials.
- `model-policy.ts` maps workloads and failure conditions to tiers.
- `model-router.ts` returns Mastra dynamic models and fallback chains.
- `usage.ts` normalizes usage metadata for logging and future `AgentRun` writes.
- `agent-runner.ts` combines routing, retrieval, memory, validation, and usage.

### Mastra dynamic models

Agents use a model resolver based on Mastra `RequestContext`. Callers provide a
workload ID rather than a raw model ID. The resolver maps the workload to its
tier and configured fallback chain.

Raw provider/model overrides are disabled by default. This prevents callers
from bypassing cost and safety policy.

### Provider configuration

Environment variables define model chains:

```txt
SHIRE_MODEL_CHEAP_PRIMARY
SHIRE_MODEL_CHEAP_FALLBACK
SHIRE_MODEL_CHEAP_LAST_RESORT
SHIRE_MODEL_BALANCED_PRIMARY
SHIRE_MODEL_BALANCED_FALLBACK
SHIRE_MODEL_BALANCED_LAST_RESORT
SHIRE_MODEL_HEAVY_PRIMARY
SHIRE_MODEL_HEAVY_FALLBACK
SHIRE_EMBEDDING_MODEL
```

Provider credentials remain separate:

```txt
OPENAI_API_KEY
OPENROUTER_API_KEY
ZAI_API_KEY
```

Startup validates that each enabled tier has at least one usable model.
Missing optional providers reduce the chain; they do not prevent startup when
another valid model remains.

## CV Processing Flow

1. Load the uploaded CV and extract plain text locally where possible.
2. Sanitize text and remove repeated headers, footers, and unsupported control
   characters.
3. Run structured extraction using the `cv-normalization` workload.
4. Validate the result with `CandidateProfileDraftSchema`.
5. Retry the same cheap tier once for transient or formatting failures.
6. Escalate to `balanced` only when schema validation still fails or confidence
   is below the configured threshold.
7. Store the validated profile as `PENDING_REVIEW`.
8. Build canonical embedding text from skills, experience, preferred roles,
   location, work preference, and portfolio summary.
9. Generate an OpenAI `text-embedding-3-small` embedding.
10. Store `embeddingText`, embedding vector, extraction provenance, and usage.
11. Require user review before the profile becomes `CONFIRMED`.

Raw CV text is not inserted into model memory. Memory stores concise workflow
state and user-approved facts to avoid token growth and stale personal data.

## Matching Flow

1. Apply hard filters in application code.
2. Retrieve candidates or jobs through vector similarity.
3. Calculate the documented rule score.
4. Ignore results below the save threshold.
5. Use a cheap model only to rerank the reduced candidate set and produce
   structured reasons.
6. Escalate borderline cases only when the rule score and model signals
   conflict.
7. Validate every model output before saving a recommendation.

This keeps the expensive model outside the broad retrieval loop.

## Memory Policy

Memory is scoped by both `threadId` and `resourceId`.

Store:

- workflow progress;
- confirmed user preferences;
- concise summaries of previous agent results;
- references to persisted application records.

Do not store:

- full raw CV content;
- full evidence files;
- wallet secrets or provider credentials;
- unconfirmed inferred profile facts;
- repository documents already available through RAG.

Working memory has a bounded summary. Recent messages are capped so old
conversation history cannot grow without limit.

## RAG Policy

The repository knowledge index uses only the explicit manifest:

```txt
.agent/context/architecture.md
.agent/context/agent/orchestration.md
.agent/context/agent/runtime-context.md
.agent/context/agent/workflows.md
.agent/context/agent/matching-pipeline.md
.agent/context/agent/api.md
.agent/context/auth/README.md
.agent/context/schemas/README.md
.agent/context/onchain/README.md
.agent/decisions/log.md
```

Documents are chunked with path, heading, priority, and content hash metadata.
Sync skips unchanged chunks and removes stale chunks. Retrieval uses a small
`topK` and a context-character budget before injection into model calls.

## Escalation Rules

Escalation is allowed when:

- the provider returns a retryable failure;
- structured output fails schema validation after the cheap retry;
- the workload confidence is below its configured threshold;
- a matching result is borderline and has conflicting signals;
- the workload policy explicitly requires `heavy`.

Escalation is not allowed merely because a stronger model is configured.

Every escalation records:

- workload;
- previous provider and model;
- next provider and model;
- reason;
- validation error or provider error category;
- cumulative token usage and latency.

## Usage and Cost Controls

Each generation records normalized usage:

```ts
type ModelUsageRecord = {
  runId: string;
  workload: string;
  tier: "cheap" | "balanced" | "heavy";
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  retryCount: number;
  escalationReason?: string;
};
```

Token-saving controls:

- retrieve before generating;
- cap RAG context size;
- use structured, concise prompts;
- avoid sending unchanged repository context repeatedly;
- summarize bounded memory instead of replaying full history;
- run deterministic filters and scores before AI reranking;
- set workload-specific output token limits;
- stop after the first schema-valid response.

## Error Handling

- Invalid environment configuration fails with actionable model-tier details.
- Provider authentication failures disable only that provider when alternatives
  remain.
- Schema failures include Zod issue paths without logging sensitive CV text.
- Embedding failure does not discard a valid normalized profile; it marks the
  profile for embedding retry.
- Knowledge index absence returns an explicit empty-context result.
- Exhausted model chains return a structured failure and never silently save
  partial profile or recommendation data.

## Testing Strategy

Unit tests cover:

- environment and model-chain parsing;
- workload-to-tier mapping;
- fallback and escalation decisions;
- provider availability filtering;
- CV canonical embedding text;
- structured extraction validation;
- usage normalization;
- memory configuration;
- knowledge manifest and context budget;
- agent runner forwarding memory and request context.

Integration tests use fake model adapters and deterministic embeddings. Live
provider calls are excluded from the default test suite.

End-to-end verification covers:

- knowledge sync;
- CV normalization followed by embedding;
- cheap-model success without escalation;
- cheap-model schema failure followed by balanced fallback;
- heavy dispute summary routing;
- token usage in the final job result.

## Rollout

1. Add configuration and policy types without changing current agent behavior.
2. Add usage logging and deterministic model routing.
3. Add persistent memory.
4. Add repository knowledge sync and retrieval.
5. Add structured CV normalization and candidate embeddings.
6. Add retrieval-first matching and cheap reranking.
7. Enable heavy-model dispute summaries.
8. Tune model IDs and thresholds using observed usage records.

## Success Criteria

- Routine workloads do not call the heavy OpenAI model.
- CV normalization produces schema-valid, database-ready drafts.
- CV embeddings are generated separately from normalization.
- Matching filters and vector retrieval execute before model reranking.
- Provider failures use the configured fallback chain.
- Every model call exposes usage and routing metadata.
- Memory and RAG context remain bounded.
- All agent tests and builds pass without live provider credentials.
