# `apps/agent`

Background orchestration service for Shire.

## Structure
- `src/mastra/agents/` contains domain agents
- `src/mastra/workflows/` contains workflow definitions
- `src/mastra/tools/` contains reusable orchestration tools
- `src/jobs/` contains runnable background job entrypoints
- `src/server.ts` is the local runtime entrypoint
- `src/env.ts` centralizes runtime environment access
