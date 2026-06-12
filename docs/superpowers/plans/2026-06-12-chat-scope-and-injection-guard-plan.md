# Chat Scope and Prompt Injection Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Block prompt injection and unrelated questions before the Shire chat model, memory, retrieval, or tools execute, while returning valid English Assistant UI streams.

**Architecture:** Add a deterministic classifier and AI SDK v6 fallback stream builder in the agent runtime. Mount an Express middleware before Mastra routes for the role-aware chat agent, then strengthen agent instructions as a second defense layer.

**Tech Stack:** TypeScript, Express, Mastra, AI SDK v6 SSE, Node test runner

---

### Task 1: Deterministic Chat Guard

**Files:**
- Create: `apps/agent/src/runtime/chat-guard.ts`
- Create: `apps/agent/test/chat-guard.test.ts`
- Modify: `apps/agent/test/index.ts`

- [x] **Step 1: Write failing tests for message extraction and classification**

Test AI SDK v6 `parts`, legacy `content`, valid Shire questions, unrelated questions, prompt overrides, hidden prompt requests, role manipulation, and empty input.

- [x] **Step 2: Run the focused test and verify it fails**

Run: `node --import tsx --test apps/agent/test/chat-guard.test.ts`

Expected: FAIL because `chat-guard.ts` does not exist.

- [x] **Step 3: Implement minimal extraction and deterministic classification**

Export:

```ts
extractLatestUserText(body: unknown): string | undefined
classifyChatRequest(body: unknown): ChatGuardDecision
```

Classification order must be prompt injection, allowed Shire topic, then out of scope.

- [x] **Step 4: Run the focused test and verify it passes**

Run: `node --import tsx --test apps/agent/test/chat-guard.test.ts`

Expected: PASS.

### Task 2: AI SDK v6 Fallback Stream

**Files:**
- Modify: `apps/agent/src/runtime/chat-guard.ts`
- Modify: `apps/agent/test/chat-guard.test.ts`

- [x] **Step 1: Write failing tests for English fallback text and SSE framing**

Assert the stream includes `start`, `text-start`, `text-delta`, `text-end`,
`finish`, and `[DONE]`.

- [x] **Step 2: Run the focused test and verify it fails**

Run: `node --import tsx --test apps/agent/test/chat-guard.test.ts`

Expected: FAIL because stream generation is missing.

- [x] **Step 3: Implement deterministic fallback stream generation**

Export constants for injection and out-of-scope responses and:

```ts
createChatFallbackStream(decision: BlockedChatGuardDecision): string
```

- [x] **Step 4: Run the focused test and verify it passes**

Run: `node --import tsx --test apps/agent/test/chat-guard.test.ts`

Expected: PASS.

### Task 3: Pre-Mastra HTTP Enforcement

**Files:**
- Modify: `apps/agent/src/server.ts`
- Modify: `apps/agent/test/server.test.ts`

- [x] **Step 1: Write failing HTTP integration tests**

Prove prompt injection and unrelated input return `200 text/event-stream`, and
that a valid Shire input is passed to the next handler.

- [x] **Step 2: Run the server tests and verify they fail**

Run: `node --import tsx --test apps/agent/test/server.test.ts`

Expected: blocked requests still reach Mastra.

- [x] **Step 3: Mount the guard before Mastra server initialization**

For `POST /chat/role-aware-chat-agent`, classify the body and short-circuit
blocked requests. Log only classification and message length.

- [x] **Step 4: Run the server tests and verify they pass**

Run: `node --import tsx --test apps/agent/test/server.test.ts`

Expected: PASS.

### Task 4: Agent Defense-in-Depth Instructions

**Files:**
- Modify: `apps/agent/src/mastra/agents/role-aware-chat.agent.ts`
- Modify: `apps/agent/test/chat-agent.test.ts`

- [x] **Step 1: Write a failing test for mandatory security instructions**

Assert the instruction string covers untrusted context, protected data,
authorization boundaries, Shire-only scope, and English default.

- [x] **Step 2: Run the focused test and verify it fails**

Run: `node --import tsx --test apps/agent/test/chat-agent.test.ts`

Expected: FAIL because current instructions are incomplete.

- [x] **Step 3: Replace the agent instructions with explicit security rules**

Keep the instructions concise and declarative. Do not rely on model compliance
as the primary security boundary.

- [x] **Step 4: Run the focused test and verify it passes**

Run: `node --import tsx --test apps/agent/test/chat-agent.test.ts`

Expected: PASS.

### Task 5: Full Verification

**Files:**
- No new files

- [x] **Step 1: Run agent typecheck**

Run: `npm.cmd run typecheck --workspace=@shire/agent`

Expected: exit code 0.

- [x] **Step 2: Run full agent tests**

Run: `npm.cmd run test --workspace=@shire/agent`

Expected: all tests pass.

- [x] **Step 3: Run web typecheck and proxy tests**

Run: `npm.cmd run typecheck --workspace=@shire/web`

Run from `apps/web`: `node --import tsx --test test/chat-route.test.ts test/chat-thread.test.ts`

Expected: all commands pass.

- [x] **Step 4: Run end-to-end HTTP checks**

Start a temporary agent server with `.env`, submit one injection request, one
unrelated request, and one valid Shire request.

Expected:

- Injection: deterministic English fallback, no provider call
- Unrelated: deterministic English fallback, no provider call
- Valid Shire question: provider-backed `200 text/event-stream` with `finish`
