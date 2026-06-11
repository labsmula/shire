# Role-Aware Contextual Chat Design

## Summary

Shire will add an in-app chat experience for both candidates and recruiters.
The chat will run through `apps/web` as the browser-facing entrypoint and
`apps/agent` as the policy-owning agent runtime. The system must inject the
right context for the current user, role, and active resource while keeping
candidate and recruiter data isolated.

The chat experience will use Assistant UI in `apps/web` and Mastra chat routes
in `apps/agent`, following Mastra's documented `chatRoute({ path:
"/chat/:agentId" })` standalone-server pattern. The frontend will not call the
agent server directly. Instead, a Next.js proxy route will assemble the trusted
context envelope and forward chat traffic to the agent runtime.

## Goals

- Add a chat surface to the existing web app for candidate and recruiter flows.
- Inject role-aware context based on the current authenticated viewer and page.
- Keep chat memory isolated by user, role, and resource scope.
- Preserve strict access boundaries:
  - candidates can access only their own profile and applications;
  - recruiters can access only their own company, their own jobs, and
    candidates attached to those jobs.
- Reuse the existing Mastra memory and repository knowledge infrastructure.
- Keep repository knowledge retrieval as a secondary context layer, never as an
  access-control source.

## Non-Goals

- Building an admin chat experience in the first version.
- Allowing direct browser-to-agent requests.
- Introducing a production database integration in this pass.
- Letting the client decide which private records may be injected.
- Merging all role and page conversations into one shared thread.

## Current Constraints

### Existing web app state

`apps/web` currently uses a demo-friendly client store and role switching
patterns:

- the active role lives in the Zustand app store;
- the authenticated identity currently comes from Privy or a local demo
  fallback;
- candidate and recruiter views already use stable IDs and typed local data.

This means the first version can ship with strict policy checks over the
existing store-shaped domain model without waiting for the full backend.

### Existing agent runtime

`apps/agent` already has:

- persistent Mastra memory backed by libSQL;
- repository-grounded retrieval through the approved knowledge manifest;
- deterministic tool contracts for user, candidate, company, job, matching, and
  evidence context;
- a `runAgentWithContext` helper that already injects bounded knowledge and
  thread/resource memory.

The new chat path should reuse these capabilities instead of creating a second
parallel agent stack.

## Core Decisions

### Browser traffic goes through Next.js first

The web app will expose the browser-facing chat route. The browser sends its
messages and page metadata to `apps/web`. The Next.js route derives the trusted
viewer identity and active role, builds the context envelope, and forwards the
request to the agent server.

This keeps the client from forging raw `viewerId`, `role`, or arbitrary private
resource references.

### The agent runtime remains the final policy owner

The proxy route improves trust boundaries, but it does not replace server-side
authorization in `apps/agent`. The role-aware chat agent must re-check access
before any candidate, company, job, or application context is injected.

If a resource does not belong to the viewer's allowed scope, the agent must not
include it in prompts or memory-derived summaries.

### Hybrid thread model

Chat uses two thread classes:

- a general role thread per viewer and role;
- a scoped resource thread per viewer, role, and active page resource.

Examples:

```txt
candidate:me_candidate
candidate:me_candidate:job:job_123
recruiter:rec_aperture
recruiter:rec_aperture:candidate:talent_001
```

This preserves continuity for general questions while allowing page-specific
conversation memory to remain isolated.

### Repository knowledge is secondary context

Shire knowledge retrieval remains available through the existing RAG index, but
it is always appended after role-scoped domain context. Repository knowledge can
explain product rules, workflow behavior, or domain concepts, but it must never
grant access to a candidate, recruiter, or job record.

## Architecture

### `apps/agent`

Add a new role-aware chat agent and supporting context resolution modules.

Planned additions:

```txt
apps/agent/src/mastra/agents/role-aware-chat.agent.ts
apps/agent/src/runtime/chat-context.ts
apps/agent/src/runtime/chat-policy.ts
apps/agent/src/runtime/chat-thread.ts
apps/agent/src/runtime/chat-types.ts
```

Responsibilities:

- `role-aware-chat.agent.ts`
  - defines the chat agent instructions;
  - keeps responses concise, contextual, and bounded by policy;
  - uses existing knowledge and memory infrastructure.
- `chat-types.ts`
  - defines typed request/context envelope shapes.
- `chat-thread.ts`
  - builds deterministic thread and resource keys from viewer, role, and page
    scope.
- `chat-policy.ts`
  - checks whether the requested resource is allowed for the viewer.
- `chat-context.ts`
  - resolves and formats the context payload that can be safely injected into
    prompts.

`src/mastra/index.ts` will register Mastra's documented server route:

```ts
server: {
  apiRoutes: [
    chatRoute({
      path: "/chat/:agentId",
    }),
  ],
}
```

The exposed agent path for Assistant UI integration will target this new agent.

### `apps/web`

Add an Assistant UI-based chat surface plus a proxy route that forwards to the
agent runtime.

Planned additions:

```txt
apps/web/app/api/chat/[scope]/route.ts
apps/web/components/ai/chat-panel.tsx
apps/web/components/ai/chat-context-badge.tsx
apps/web/lib/chat/thread.ts
apps/web/lib/chat/context.ts
apps/web/lib/chat/types.ts
```

Responsibilities:

- the API route accepts browser chat requests;
- trusted role and viewer identity are derived from app auth/store state;
- page-level resource hints are normalized into a typed envelope;
- the route forwards the request to `apps/agent`;
- the UI renders a reusable chat panel in both candidate and recruiter flows;
- the UI shows the current scope so the user understands whether the thread is
  general or attached to a resource.

## Context Envelope

The browser-facing route in `apps/web` will forward a typed envelope similar to:

```ts
type ChatScope = {
  viewerId: string;
  role: "candidate" | "recruiter";
  resourceType?: "job" | "candidate" | "company" | "application";
  resourceId?: string;
  threadId: string;
  resourceKey: string;
};
```

The browser may submit page hints such as `"job"` and `"job-001"`, but the
trusted `viewerId`, `role`, and final thread/resource keys are server-derived.

## Policy Rules

### Candidate access

Candidates may resolve:

- their own candidate profile;
- their own applications;
- the job attached to the current application or currently viewed page;
- general repository knowledge.

Candidates may not resolve:

- another candidate profile;
- recruiter-only company internals;
- recruiter-side application lists beyond their own records.

### Recruiter access

Recruiters may resolve:

- their own recruiter/company profile;
- jobs they own;
- applications attached to those jobs;
- candidate records only when those candidates are attached to those jobs;
- general repository knowledge.

Recruiters may not resolve:

- unrelated candidate profiles;
- jobs owned by another recruiter;
- company records outside their own scope.

### Failure mode

If the requested resource fails policy validation:

- the agent omits that resource context;
- the chat response stays safe and generic;
- the system should prefer a structured denial explanation over silent leakage.

## Prompt and Memory Model

The chat agent prompt will be assembled in this order:

1. static agent instructions;
2. viewer identity and role summary;
3. allowed domain context;
4. optional active resource context;
5. repository knowledge context from RAG;
6. user message history from the isolated thread.

Memory remains bounded through the existing Mastra settings:

- recent messages capped;
- working memory enabled;
- no raw bulk private documents stored;
- page-specific threads separated from role-general threads.

Store in memory:

- conversation summaries;
- confirmed preferences;
- referenced record IDs;
- concise agent conclusions.

Do not store:

- unauthorized records;
- raw full-page dumps of unrelated entities;
- repository documents already available via retrieval;
- credentials or secrets.

## UI Behavior

### Entry points

The candidate and recruiter app surfaces will each expose the same chat panel
component, but pass different scope metadata based on the current route.

The first version should focus on pages where context relevance is strongest:

- candidate profile pages;
- candidate job detail pages;
- recruiter profile pages;
- recruiter job detail pages;
- recruiter applicant/candidate detail views.

### Context awareness

The UI should show:

- current role;
- whether the chat is general or scoped;
- the active entity label when applicable.

Examples:

- `Candidate / General`
- `Candidate / Job / Product Engineer`
- `Recruiter / Candidate / Maya Okafor`

### Thread switching

When the user changes pages:

- resource pages switch to their scoped thread;
- non-resource pages fall back to the general role thread;
- previous scoped threads remain available through memory and can be reopened
  when returning to the same resource.

## Data Resolution Strategy

The first implementation should stay aligned with current repo boundaries.

`apps/web` already has typed local seed/store structures. `apps/agent` already
has deterministic runtime fixtures. For the first pass, context resolution
should adapt one of these existing datasets into a shared typed shape rather
than inventing speculative persistence abstractions.

The preferred direction is:

- `apps/web` sends minimal trusted scope metadata;
- `apps/agent` resolves context from deterministic runtime-accessible sources;
- later persistence work can replace the resolver internals without changing the
  chat contract.

## Error Handling

- Missing viewer identity returns an authorization failure at the web proxy.
- Unsupported roles return a structured validation error.
- Invalid resource type or malformed resource ID returns a validation error.
- Policy denials return a safe, non-leaking assistant response.
- Agent server unavailability returns a user-facing retryable error in the UI.
- Knowledge lookup failure should not block domain-context chat if core context
  resolution still succeeds.

## Testing Strategy

### Agent tests

Add unit and integration tests for:

- thread key generation;
- candidate and recruiter access policy;
- context resolution for allowed resources;
- denial behavior for forbidden resources;
- role-aware prompt assembly with optional RAG context;
- Mastra chat route registration and agent export stability.

### Web tests

Add tests for:

- proxy route validation and envelope construction;
- role-derived thread selection;
- page context mapping;
- safe forwarding when optional resource scope is absent.

### End-to-end verification

Fresh verification before completion should include:

- `npm run test --workspace=@shire/agent`
- `npm run test --workspace=apps/web` or the workspace-equivalent web test
  command once chat tests exist
- `npm run build --workspace=@shire/agent`
- `npm run build --workspace=@shire/web` or the workspace-equivalent web build
  command

Manual browser verification should confirm:

- candidate general chat does not leak recruiter-only context;
- recruiter job chat resolves only owned job context;
- recruiter candidate chat works only for candidates attached to the recruiter's
  job;
- switching between general and resource pages changes thread scope correctly.

## Rollout

1. Add the design-conforming typed chat envelope and thread builders.
2. Add agent-side policy and context resolution with tests.
3. Register the Mastra chat route and role-aware chat agent.
4. Add the Next.js proxy route and Assistant UI transport wiring.
5. Add the shared chat panel to candidate and recruiter flows.
6. Verify thread isolation, policy enforcement, and RAG-assisted answers.

## Success Criteria

- Candidate and recruiter chat both work inside `apps/web`.
- The browser never talks directly to the Mastra server.
- Thread memory stays isolated by viewer, role, and resource scope.
- Recruiters cannot access unrelated candidates through chat.
- Candidates cannot access other candidates or recruiter-only context.
- Repository knowledge improves answers without weakening access boundaries.
- The system fits the current demo/store-backed architecture without inventing a
  second data model.
