# Hybrid Chat Intent Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow valid and ambiguous Shire help requests to reach the scoped agent while deterministically blocking prompt injection and clearly unrelated intents.

**Architecture:** Keep the existing pre-model guard and decision contract. Extend its explicit allowed intents for English and Indonesian, add a narrow high-confidence unrelated-intent list, and default unmatched harmless text to `allow`.

**Tech Stack:** TypeScript, Node.js test runner, Express runtime, Mastra chat route

---

### Task 1: Add classifier regression coverage

**Files:**
- Modify: `apps/agent/test/chat-guard.test.ts`

- [ ] **Step 1: Add failing platform-help and ambiguous-intent tests**

Add assertions that these messages return `allow`:

```ts
[
  "Bagaimana cara menggunakan aplikasi ini?",
  "How do I use this platform?",
  "Can you help me get started?",
]
```

- [ ] **Step 2: Add explicit unrelated-intent coverage**

Keep the recipe case and add weather, sports, entertainment trivia, and unrelated coding homework as `out-of-scope`.

- [ ] **Step 3: Run the classifier tests and verify failure**

Run:

```powershell
node --import tsx --test test/chat-guard.test.ts
```

Expected: the Indonesian platform-help and ambiguous request tests fail because the current guard returns `out-of-scope`.

### Task 2: Implement hybrid intent classification

**Files:**
- Modify: `apps/agent/src/runtime/chat-guard.ts`

- [ ] **Step 1: Extend explicit allowed intent patterns**

Add English and Indonesian platform, navigation, authentication, account, profile, onboarding, recruitment, and application vocabulary.

- [ ] **Step 2: Add narrow unrelated-intent patterns**

Add high-confidence patterns for recipes, weather queries, sports scores, entertainment trivia, and explicit unrelated coding homework.

- [ ] **Step 3: Change unmatched behavior**

After prompt-injection, social, and allowed-intent checks, return `out-of-scope` only when an unrelated pattern matches. Return `allow` for all other non-empty messages.

- [ ] **Step 4: Run classifier tests**

Run:

```powershell
node --import tsx --test test/chat-guard.test.ts
```

Expected: all classifier tests pass.

### Task 3: Verify server route delegation

**Files:**
- Modify: `apps/agent/test/server.test.ts`

- [ ] **Step 1: Add a route regression test**

Start the runtime server with an injected `searchProductKnowledge` dependency, send `Bagaimana cara menggunakan aplikasi ini?`, and assert:

```ts
assert.equal(response.status, 200);
assert.equal(retrievalCalls, 1);
assert.ok(!body.includes(JSON.stringify(OUT_OF_SCOPE_RESPONSE)));
```

- [ ] **Step 2: Run targeted server and guard tests**

Run:

```powershell
node --import tsx --test test/chat-guard.test.ts test/server.test.ts
```

Expected: all targeted tests pass.

### Task 4: Verify and publish

**Files:**
- Verify all modified files

- [ ] **Step 1: Run the complete agent test suite**

```powershell
npm run test --workspace=@shire/agent
```

Expected: zero failed tests.

- [ ] **Step 2: Run the TypeScript build**

```powershell
npm run build --workspace=@shire/agent
```

Expected: exit code 0.

- [ ] **Step 3: Check patch formatting**

```powershell
git diff --check
```

Expected: no errors.

- [ ] **Step 4: Commit the feature**

```powershell
git add apps/agent/src/runtime/chat-guard.ts apps/agent/test/chat-guard.test.ts apps/agent/test/server.test.ts docs/superpowers/plans/2026-06-12-hybrid-chat-intent-routing.md
git commit -m "fix(agent): route ambiguous chat through scoped intent guard"
```

- [ ] **Step 5: Push the branch**

```powershell
git push
```
