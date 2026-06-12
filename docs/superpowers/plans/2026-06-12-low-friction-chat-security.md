# Low-Friction Chat Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a default-allow chat security pipeline that rejects malformed or abusive requests and confirmed security attacks without blocking unknown languages or unmapped user wording.

**Architecture:** Add small server-side stages around the existing Mastra route. Deterministic validation, caller identity, rate limiting, security indicators, risk policy, authorization, output processing, and telemetry remain isolated modules with dependency injection; the low-cost model guard runs only for suspicious input.

**Tech Stack:** TypeScript, Node.js test runner, Express 5, Mastra agents/processors, Zod, OpenRouter

---

## File Map

- `apps/agent/src/env.ts`: bounded security and request-pipeline configuration.
- `apps/agent/src/runtime/chat-validation.ts`: deterministic body and scope validation.
- `apps/agent/src/runtime/rate-limit.ts`: adapter contract and in-memory implementation.
- `apps/agent/src/runtime/chat-caller.ts`: stable viewer/IP rate-limit identity.
- `apps/agent/src/runtime/security-indicators.ts`: multilingual deterministic security signals.
- `apps/agent/src/runtime/security-guard.ts`: structured low-cost model classifier.
- `apps/agent/src/runtime/security-policy.ts`: deterministic fail-open/fail-closed decisions.
- `apps/agent/src/runtime/chat-intent.ts`: advisory intent metadata only.
- `apps/agent/src/runtime/output-validation.ts`: deterministic response leakage checks.
- `apps/agent/src/runtime/security-telemetry.ts`: sanitized structured security events.
- `apps/agent/src/mastra/processors/chat-output.processor.ts`: Mastra output processor.
- `apps/agent/src/server.ts`: pipeline orchestration and dependency injection.
- `apps/agent/test/fixtures/chat-security-evals.ts`: versioned benign and attack cases.

### Task 1: Add bounded security configuration

**Files:**
- Modify: `apps/agent/src/env.ts`
- Modify: `apps/agent/.env.example`
- Modify: `apps/agent/test/env.test.ts`

- [ ] **Step 1: Write failing configuration tests**

Assert these defaults:

```ts
assert.equal(env.chatMaxBodyBytes, 65_536);
assert.equal(env.chatMaxMessages, 50);
assert.equal(env.chatMaxMessageCharacters, 8_000);
assert.equal(env.chatRateLimitRequests, 30);
assert.equal(env.chatRateLimitWindowSeconds, 60);
assert.equal(env.securityGuardEnabled, true);
assert.equal(env.securityGuardMode, "suspicious-only");
assert.equal(env.securityGuardThreshold, 0.85);
assert.equal(env.outputMaxCharacters, 12_000);
```

Assert invalid thresholds outside `0..1` and unsupported guard modes throw.

- [ ] **Step 2: Verify RED**

Run:

```powershell
node --import tsx --test test/env.test.ts
```

Expected: FAIL because the properties do not exist.

- [ ] **Step 3: Implement parsers and defaults**

Add `parseUnitInterval`, guard-mode parsing, and the properties above. Parse
`SHIRE_SECURITY_GUARD_MODELS` as a model chain with explicit defaults:

```ts
[
  "openrouter/openai/gpt-oss-20b:free",
  "openrouter/nex-agi/nex-n2-pro:free",
]
```

These defaults reuse the verified free chat chain. A dedicated safeguard model
can replace the chain through environment configuration when budget permits.

- [ ] **Step 4: Verify GREEN and commit**

```powershell
node --import tsx --test test/env.test.ts
git add apps/agent/src/env.ts apps/agent/.env.example apps/agent/test/env.test.ts
git commit -m "feat(agent): configure bounded chat security limits"
```

### Task 2: Validate requests without restricting unknown intent

**Files:**
- Create: `apps/agent/src/runtime/chat-validation.ts`
- Create: `apps/agent/test/chat-validation.test.ts`
- Modify: `apps/agent/test/index.ts`

- [ ] **Step 1: Write failing validation tests**

Define the desired API:

```ts
const result = validateChatRequest(body, {
  maxBodyBytes: 65_536,
  maxMessages: 50,
  maxMessageCharacters: 8_000,
});
```

Test `valid: true` for unknown-language text and `valid: false` with bounded
reason codes for malformed body, empty user message, excessive message count,
excessive latest-message length, and invalid scope role.

- [ ] **Step 2: Verify RED**

```powershell
node --import tsx --test test/chat-validation.test.ts
```

Expected: FAIL because `chat-validation.ts` does not exist.

- [ ] **Step 3: Implement validation**

Return:

```ts
type ChatValidationResult =
  | { valid: true; latestUserText: string; messageCount: number; bodyBytes: number }
  | {
      valid: false;
      reasonCode:
        | "invalid-body"
        | "missing-user-message"
        | "body-too-large"
        | "too-many-messages"
        | "message-too-long"
        | "invalid-scope";
    };
```

Use `Buffer.byteLength(JSON.stringify(body), "utf8")`. Do not inspect topic or
language.

- [ ] **Step 4: Verify GREEN and commit**

```powershell
node --import tsx --test test/chat-validation.test.ts
git add apps/agent/src/runtime/chat-validation.ts apps/agent/test/chat-validation.test.ts apps/agent/test/index.ts
git commit -m "feat(agent): validate chat request boundaries"
```

### Task 3: Add the hybrid rate-limit contract

**Files:**
- Create: `apps/agent/src/runtime/rate-limit.ts`
- Create: `apps/agent/test/rate-limit.test.ts`
- Modify: `apps/agent/test/index.ts`

- [ ] **Step 1: Write failing limiter tests**

Define:

```ts
interface RateLimiter {
  consume(input: {
    key: string;
    limit: number;
    windowMs: number;
    now?: number;
  }): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
  }>;
}
```

Test allowance, exhaustion, independent keys, and reset after the window.

- [ ] **Step 2: Verify RED**

```powershell
node --import tsx --test test/rate-limit.test.ts
```

- [ ] **Step 3: Implement in-memory fixed-window limiter**

Use a `Map<string, { count: number; resetAt: number }>` and export
`createInMemoryRateLimiter()`. Keep the interface transport-independent so a
Redis adapter can be added later.

- [ ] **Step 4: Verify GREEN and commit**

```powershell
node --import tsx --test test/rate-limit.test.ts
git add apps/agent/src/runtime/rate-limit.ts apps/agent/test/rate-limit.test.ts apps/agent/test/index.ts
git commit -m "feat(agent): add pluggable in-memory chat rate limiter"
```

### Task 4: Resolve caller identity and enforce HTTP limits

**Files:**
- Create: `apps/agent/src/runtime/chat-caller.ts`
- Create: `apps/agent/test/chat-caller.test.ts`
- Modify: `apps/agent/src/server.ts`
- Modify: `apps/agent/test/server.test.ts`
- Modify: `apps/agent/test/index.ts`

- [ ] **Step 1: Write caller-key tests**

Test viewer identity first and normalized IP fallback:

```ts
assert.equal(resolveChatCallerKey({ body, ip: "127.0.0.1" }), "viewer:candidate-001");
assert.equal(resolveChatCallerKey({ body: {}, ip: "::ffff:127.0.0.1" }), "ip:127.0.0.1");
```

- [ ] **Step 2: Write failing HTTP tests**

Inject a fake `RateLimiter` into `RuntimeHttpServerDependencies`. Assert:

- Invalid bodies skip retrieval and model forwarding.
- Unknown-language valid prompts proceed.
- The exhausted limiter returns `429`, `Retry-After`, and no retrieval.
- Different viewer IDs use different keys.

- [ ] **Step 3: Verify RED**

```powershell
node --import tsx --test test/chat-caller.test.ts test/server.test.ts
```

- [ ] **Step 4: Implement middleware integration**

Add dependencies:

```ts
rateLimiter?: RateLimiter;
now?: () => number;
```

Run validation and rate limiting before `classifyChatRequest`. Keep the existing
AI SDK stream format for validation failures; use HTTP `429` for rate limits.

- [ ] **Step 5: Verify GREEN and commit**

```powershell
node --import tsx --test test/chat-caller.test.ts test/server.test.ts
git add apps/agent/src/runtime/chat-caller.ts apps/agent/src/server.ts apps/agent/test/chat-caller.test.ts apps/agent/test/server.test.ts apps/agent/test/index.ts
git commit -m "feat(agent): enforce caller-aware chat request limits"
```

### Task 5: Separate security indicators from topic routing

**Files:**
- Create: `apps/agent/src/runtime/security-indicators.ts`
- Create: `apps/agent/test/security-indicators.test.ts`
- Modify: `apps/agent/src/runtime/chat-guard.ts`
- Modify: `apps/agent/test/chat-guard.test.ts`
- Modify: `apps/agent/test/index.ts`

- [ ] **Step 1: Write failing indicator tests**

Define:

```ts
type SecurityIndicator = {
  level: "safe" | "suspicious" | "blocked";
  category:
    | "none"
    | "prompt-injection"
    | "secret-extraction"
    | "authorization-bypass"
    | "obfuscation";
  reasonCode: string;
  text: string;
};
```

Test explicit extraction/bypass as `blocked`, encoded or less explicit override
phrases as `suspicious`, and unknown languages/ordinary unrelated questions as
`safe`.

- [ ] **Step 2: Verify RED**

```powershell
node --import tsx --test test/security-indicators.test.ts test/chat-guard.test.ts
```

- [ ] **Step 3: Implement extraction and remove topic blocking**

Move instruction-bearing text extraction and security patterns into the new
module. Change `classifyChatRequest` so:

```ts
if (!text) return invalid;
if (indicator.level === "blocked") return promptInjection;
return allow;
```

Delete unrelated-topic deny patterns. Intent mismatch must never produce a
fallback.

- [ ] **Step 4: Verify GREEN and commit**

```powershell
node --import tsx --test test/security-indicators.test.ts test/chat-guard.test.ts
git add apps/agent/src/runtime/security-indicators.ts apps/agent/src/runtime/chat-guard.ts apps/agent/test/security-indicators.test.ts apps/agent/test/chat-guard.test.ts apps/agent/test/index.ts
git commit -m "refactor(agent): isolate default-allow security indicators"
```

### Task 6: Add suspicious-only multilingual model guard

**Files:**
- Create: `apps/agent/src/runtime/security-guard.ts`
- Create: `apps/agent/src/runtime/security-policy.ts`
- Create: `apps/agent/test/security-guard.test.ts`
- Create: `apps/agent/test/security-policy.test.ts`
- Modify: `apps/agent/src/server.ts`
- Modify: `apps/agent/test/server.test.ts`
- Modify: `apps/agent/test/index.ts`

- [ ] **Step 1: Write structured guard tests**

Create a Zod schema:

```ts
z.object({
  classification: z.enum([
    "safe",
    "prompt-injection",
    "secret-extraction",
    "authorization-bypass",
  ]),
  confidence: z.number().min(0).max(1),
  reasonCode: z.enum([
    "none",
    "instruction-override",
    "protected-context",
    "credential-access",
    "role-bypass",
    "permission-bypass",
    "obfuscated-instruction",
  ]),
  detectedLanguage: z.string().min(1).max(32),
});
```

Test schema rejection, fallback across model chain, and minimum-input prompt
construction without memory or retrieved context.

- [ ] **Step 2: Write risk-policy tests**

Test:

- Safe indicator skips model guard.
- Confirmed unsafe above threshold blocks.
- Guard failure for secret/authorization categories blocks.
- Guard failure for low-risk prompt-injection suspicion allows with
  `degraded: true`.

- [ ] **Step 3: Verify RED**

```powershell
node --import tsx --test test/security-guard.test.ts test/security-policy.test.ts test/server.test.ts
```

- [ ] **Step 4: Implement guard client**

Expose an injectable interface:

```ts
export interface SecurityGuard {
  classify(input: { text: string; models: readonly string[] }): Promise<SecurityGuardResult>;
}
```

The production implementation uses a tool-free Mastra `Agent.generate()` call
with `structuredOutput.schema`. It receives only `indicator.text`.

- [ ] **Step 5: Integrate suspicious-only orchestration**

Add `securityGuard?: SecurityGuard` to server dependencies. Safe requests skip
the guard. Suspicious requests call it and pass the result to
`evaluateSecurityPolicy`. Blocked decisions skip retrieval.

- [ ] **Step 6: Verify GREEN and commit**

```powershell
node --import tsx --test test/security-guard.test.ts test/security-policy.test.ts test/server.test.ts
git add apps/agent/src/runtime/security-guard.ts apps/agent/src/runtime/security-policy.ts apps/agent/src/server.ts apps/agent/test/security-guard.test.ts apps/agent/test/security-policy.test.ts apps/agent/test/server.test.ts apps/agent/test/index.ts
git commit -m "feat(agent): guard suspicious chat with structured multilingual checks"
```

### Task 7: Add advisory intent and explicit authorization metadata

**Files:**
- Create: `apps/agent/src/runtime/chat-intent.ts`
- Create: `apps/agent/test/chat-intent.test.ts`
- Modify: `apps/agent/src/server.ts`
- Modify: `apps/agent/test/server.test.ts`
- Modify: `apps/agent/test/chat-policy.test.ts`
- Modify: `apps/agent/test/index.ts`

- [ ] **Step 1: Write advisory intent tests**

Define categories:

```ts
type ChatIntent =
  | "platform-help"
  | "job-search"
  | "application-help"
  | "candidate-matching"
  | "recruiter-workflow"
  | "social"
  | "unknown";
```

Test deterministic English/Indonesian examples and unsupported-language text as
`unknown`.

- [ ] **Step 2: Prove intent cannot grant authorization**

Add a server/policy test where the prompt says it is authorized and maps to a
known intent, but `evaluateChatPolicy` still returns `forbidden` for an unrelated
resource.

- [ ] **Step 3: Verify RED**

```powershell
node --import tsx --test test/chat-intent.test.ts test/chat-policy.test.ts test/server.test.ts
```

- [ ] **Step 4: Implement metadata-only integration**

Set intent on server-local telemetry context only. Do not mutate role, scope,
viewer, resource, or policy from intent output.

- [ ] **Step 5: Verify GREEN and commit**

```powershell
node --import tsx --test test/chat-intent.test.ts test/chat-policy.test.ts test/server.test.ts
git add apps/agent/src/runtime/chat-intent.ts apps/agent/src/server.ts apps/agent/test/chat-intent.test.ts apps/agent/test/chat-policy.test.ts apps/agent/test/server.test.ts apps/agent/test/index.ts
git commit -m "feat(agent): attach non-authoritative chat intent metadata"
```

### Task 8: Validate generated output with a Mastra processor

**Files:**
- Create: `apps/agent/src/runtime/output-validation.ts`
- Create: `apps/agent/src/mastra/processors/chat-output.processor.ts`
- Create: `apps/agent/test/output-validation.test.ts`
- Create: `apps/agent/test/chat-output-processor.test.ts`
- Modify: `apps/agent/src/mastra/agents/role-aware-chat.agent.ts`
- Modify: `apps/agent/test/chat-agent.test.ts`
- Modify: `apps/agent/test/index.ts`

- [ ] **Step 1: Write failing output validation tests**

Define:

```ts
type OutputValidationResult =
  | { safe: true }
  | {
      safe: false;
      reasonCode:
        | "output-too-long"
        | "system-prompt-leak"
        | "credential-leak"
        | "unauthorized-action-claim";
    };
```

Test safe Shire answers, excessive output, API-key-like values, explicit system
prompt disclosure, and claims such as “I accessed another candidate's private
profile”.

- [ ] **Step 2: Verify RED**

```powershell
node --import tsx --test test/output-validation.test.ts test/chat-output-processor.test.ts
```

- [ ] **Step 3: Implement processor**

Implement Mastra `Processor.processOutputStep({ text, abort })`. On unsafe output:

```ts
abort("The response was blocked by output security validation.", {
  metadata: { reasonCode: result.reasonCode },
});
```

Attach it to `roleAwareChatAgent.outputProcessors`. Keep `maxProcessorRetries`
disabled so blocked output cannot loop and consume free-model quota.

- [ ] **Step 4: Verify GREEN and commit**

```powershell
node --import tsx --test test/output-validation.test.ts test/chat-output-processor.test.ts test/chat-agent.test.ts
git add apps/agent/src/runtime/output-validation.ts apps/agent/src/mastra/processors/chat-output.processor.ts apps/agent/src/mastra/agents/role-aware-chat.agent.ts apps/agent/test/output-validation.test.ts apps/agent/test/chat-output-processor.test.ts apps/agent/test/chat-agent.test.ts apps/agent/test/index.ts
git commit -m "feat(agent): block unsafe chat output before delivery"
```

### Task 9: Add sanitized telemetry and evaluation fixtures

**Files:**
- Create: `apps/agent/src/runtime/security-telemetry.ts`
- Create: `apps/agent/test/security-telemetry.test.ts`
- Create: `apps/agent/test/fixtures/chat-security-evals.ts`
- Create: `apps/agent/test/chat-security-evals.test.ts`
- Modify: `apps/agent/src/server.ts`
- Modify: `apps/agent/test/server.test.ts`
- Modify: `apps/agent/test/index.ts`
- Modify: `apps/agent/README.md`

- [ ] **Step 1: Write telemetry tests**

Build an event that includes request ID, hashed caller key, validation, limiter,
indicator, guard metadata, intent, authorization scope, retrieval count, output
result, and duration. Assert the serialized event contains neither the raw
prompt nor raw viewer ID.

- [ ] **Step 2: Write evaluation fixture tests**

Add fixtures for:

- Benign English, Indonesian, Spanish, Japanese, and Arabic prompts.
- Multilingual prompt injection.
- Secret extraction.
- Authorization bypass.
- Obfuscation.
- Ambiguous and unrelated harmless questions.

Assert all benign cases avoid deterministic blocking and all explicit
high-confidence attacks are blocked or marked suspicious.

- [ ] **Step 3: Verify RED**

```powershell
node --import tsx --test test/security-telemetry.test.ts test/chat-security-evals.test.ts test/server.test.ts
```

- [ ] **Step 4: Implement sanitized events**

Hash caller keys with SHA-256 and truncate to 16 hex characters. Store reason
codes and lengths, never raw prompts, system content, model output, credentials,
or unhashed viewer IDs.

- [ ] **Step 5: Integrate and document**

Emit one structured event at request completion and document configuration,
default-allow behavior, rate-limit adapter replacement, and evaluation command.

- [ ] **Step 6: Verify GREEN and commit**

```powershell
node --import tsx --test test/security-telemetry.test.ts test/chat-security-evals.test.ts test/server.test.ts
git add apps/agent/src/runtime/security-telemetry.ts apps/agent/src/server.ts apps/agent/test/security-telemetry.test.ts apps/agent/test/fixtures/chat-security-evals.ts apps/agent/test/chat-security-evals.test.ts apps/agent/test/server.test.ts apps/agent/test/index.ts apps/agent/README.md
git commit -m "feat(agent): audit chat security decisions with eval fixtures"
```

### Task 10: Final verification and publish

**Files:**
- Verify all changed files

- [ ] **Step 1: Run focused security tests**

```powershell
node --import tsx --test test/chat-validation.test.ts test/rate-limit.test.ts test/chat-caller.test.ts test/security-indicators.test.ts test/security-guard.test.ts test/security-policy.test.ts test/chat-intent.test.ts test/output-validation.test.ts test/chat-output-processor.test.ts test/security-telemetry.test.ts test/chat-security-evals.test.ts test/server.test.ts
```

Expected: zero failed tests.

- [ ] **Step 2: Run the full suite**

```powershell
npm run test --workspace=@shire/agent
```

Expected: zero failed tests.

- [ ] **Step 3: Build and inspect**

```powershell
npm run build --workspace=@shire/agent
git diff --check
git status --short --branch
```

Expected: build exit `0`, no patch errors, and only intentional files changed.

- [ ] **Step 4: Commit the implementation plan**

```powershell
git add docs/superpowers/plans/2026-06-12-low-friction-chat-security.md
git commit -m "docs(agent): plan low-friction chat security slices"
```

- [ ] **Step 5: Push all slice commits**

```powershell
git push
```
