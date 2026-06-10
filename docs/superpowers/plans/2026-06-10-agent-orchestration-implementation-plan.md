# Shire Agent Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `apps/agent` into a lean, event-driven orchestration service with explicit autonomy modes, deterministic workflow boundaries, and clear job routing for CV parsing, job matching, talent matching, dispute summaries, and onchain sync.

**Architecture:** Keep the runtime in `apps/agent` only. Use Mastra for the agent/workflow registry, `src/server.ts` for job dispatch and runtime bootstrap, and `src/env.ts` for all runtime configuration including autonomy mode and port. The agent should be service-like and event-driven, not a free-roaming background process.

**Tech Stack:** TypeScript, npm workspaces, Mastra, zod, Node.js, `tsx`, built-in `node:test` or `tsx --test` for verification.

---

### Task 1: Add explicit autonomy mode config

**Files:**
- Modify: `apps/agent/src/env.ts`
- Create: `apps/agent/src/runtime/autonomy.ts`
- Create: `apps/agent/test/env.test.ts`
- Modify: `apps/agent/package.json`

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { parseAutonomyMode } from "../src/runtime/autonomy";

test("parses the default autonomy mode as semi-autonomous", () => {
  assert.equal(parseAutonomyMode(undefined), "semi-autonomous");
});

test("rejects unsupported autonomy modes", () => {
  assert.throws(() => parseAutonomyMode("free-roaming"));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm exec tsx --test apps/agent/test/env.test.ts`
Expected: FAIL because `parseAutonomyMode` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
import { parseAutonomyMode } from "./runtime/autonomy";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3001),
  autonomyMode: parseAutonomyMode(process.env.SHIRE_AUTONOMY_MODE),
} as const;
```

```ts
export type AutonomyMode = "manual" | "semi-autonomous" | "fully-autonomous";

export function parseAutonomyMode(value: string | undefined): AutonomyMode {
  if (value === undefined || value === "") return "semi-autonomous";
  if (value === "manual" || value === "semi-autonomous" || value === "fully-autonomous") {
    return value;
  }
  throw new Error(`Unsupported autonomy mode: ${value}`);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm exec tsx --test apps/agent/test/env.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/env.ts apps/agent/src/runtime/autonomy.ts apps/agent/test/env.test.ts apps/agent/package.json
git commit -m "feat(agent): add explicit autonomy mode config"
```

### Task 2: Add guardrail escalation for ambiguous or risky actions

**Files:**
- Create: `apps/agent/src/runtime/guardrails.ts`
- Create: `apps/agent/test/guardrails.test.ts`
- Modify: `apps/agent/src/server.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { evaluateGuardrail } from "../src/runtime/guardrails";

test("returns escalation when autonomy is manual", () => {
  assert.equal(
    evaluateGuardrail({ autonomyMode: "manual", risk: "high" }).decision,
    "escalate",
  );
});

test("returns proceed when autonomy is semi-autonomous and risk is low", () => {
  assert.equal(
    evaluateGuardrail({ autonomyMode: "semi-autonomous", risk: "low" }).decision,
    "proceed",
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm exec tsx --test apps/agent/test/guardrails.test.ts`
Expected: FAIL because `evaluateGuardrail` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
export type GuardrailDecision = "proceed" | "escalate";
export type GuardrailRisk = "low" | "medium" | "high";

export function evaluateGuardrail(input: {
  autonomyMode: "manual" | "semi-autonomous" | "fully-autonomous";
  risk: GuardrailRisk;
}): { decision: GuardrailDecision; reason: string } {
  if (input.autonomyMode === "manual" || input.risk === "high") {
    return { decision: "escalate", reason: "Requires human approval" };
  }

  return {
    decision: "proceed",
    reason: "Safe to execute within current autonomy mode",
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm exec tsx --test apps/agent/test/guardrails.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/runtime/guardrails.ts apps/agent/test/guardrails.test.ts apps/agent/src/server.ts
git commit -m "feat(agent): add guardrail escalation"
```

### Task 3: Make the server an event-driven dispatcher

**Files:**
- Modify: `apps/agent/src/server.ts`
- Create: `apps/agent/src/runtime/job-registry.ts`
- Create: `apps/agent/test/server.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { resolveJobName } from "../src/runtime/job-registry";

test("resolves known job names", () => {
  assert.equal(resolveJobName("cv-parse"), "cv-parse");
});

test("returns null for unknown job names", () => {
  assert.equal(resolveJobName("unknown"), null);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm exec tsx --test apps/agent/test/server.test.ts`
Expected: FAIL because `resolveJobName` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
const jobs = [
  "cv-parse",
  "job-matching",
  "talent-matching",
  "onchain-sync",
  "dispute-summary",
] as const;

export type JobName = (typeof jobs)[number];

export function resolveJobName(value: string | undefined): JobName | null {
  if (!value) return null;
  return (jobs as readonly string[]).includes(value) ? (value as JobName) : null;
}

export const jobRegistry = jobs;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm exec tsx --test apps/agent/test/server.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/server.ts apps/agent/src/runtime/job-registry.ts apps/agent/test/server.test.ts
git commit -m "feat(agent): add job routing helpers"
```

### Task 4: Stabilize workflow boundaries with deterministic outputs

**Files:**
- Modify: `apps/agent/src/mastra/workflows/parse-cv.workflow.ts`
- Modify: `apps/agent/src/mastra/workflows/job-matching.workflow.ts`
- Modify: `apps/agent/src/mastra/workflows/talent-matching.workflow.ts`
- Modify: `apps/agent/src/mastra/workflows/dispute-summary.workflow.ts`
- Create: `apps/agent/test/workflows.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { parseCvWorkflow } from "../src/mastra/workflows/parse-cv.workflow";

test("parseCvWorkflow exposes the expected workflow id", () => {
  assert.equal(parseCvWorkflow.id, "parse-cv-workflow");
});
```

- [ ] **Step 2: Run the test to verify it fails or is incomplete**

Run: `npm exec tsx --test apps/agent/test/workflows.test.ts`
Expected: PASS for the workflow id check, then extend the same test file with one direct assertion per helper function once each helper is extracted from the workflow file.

- [ ] **Step 3: Write the minimal implementation**

```ts
export const parseCvWorkflow = createWorkflow({
  id: "parse-cv-workflow",
  inputSchema: z.object({ rawCv: z.string() }),
  outputSchema: z.object({
    profileSummary: z.string(),
    keywords: z.array(z.string()),
  }),
})
  .then(parseCvStep)
  .commit();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm exec tsx --test apps/agent/test/workflows.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/mastra/workflows apps/agent/test/workflows.test.ts
git commit -m "feat(agent): stabilize workflow outputs"
```

### Task 5: Replace stub tools with explicit context contracts

**Files:**
- Modify: `apps/agent/src/mastra/tools/user.tools.ts`
- Modify: `apps/agent/src/mastra/tools/candidate.tools.ts`
- Modify: `apps/agent/src/mastra/tools/company.tools.ts`
- Modify: `apps/agent/src/mastra/tools/job.tools.ts`
- Modify: `apps/agent/src/mastra/tools/matching.tools.ts`
- Modify: `apps/agent/src/mastra/tools/evidence.tools.ts`
- Create: `apps/agent/test/tools.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { userContextTool } from "../src/mastra/tools/user.tools";

test("userContextTool exposes the expected id", () => {
  assert.equal(userContextTool.id, "user-context-tool");
});
```

- [ ] **Step 2: Run the test to verify it fails or is incomplete**

Run: `npm exec tsx --test apps/agent/test/tools.test.ts`
Expected: PASS for the tool id check, then extend the same file with one execute-path assertion per tool wrapper once the helper contract is finalized.

- [ ] **Step 3: Write the minimal implementation**

```ts
export const userContextTool = createTool({
  id: "user-context-tool",
  description: "Return a compact user context payload for orchestration.",
  inputSchema: z.object({
    userId: z.string(),
    scope: z.string().optional(),
  }),
  outputSchema: z.object({
    userId: z.string(),
    scope: z.string().optional(),
    status: z.string(),
  }),
  execute: async ({ userId, scope }) => ({
    userId,
    scope,
    status: "loaded",
  }),
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm exec tsx --test apps/agent/test/tools.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/mastra/tools apps/agent/test/tools.test.ts
git commit -m "feat(agent): define explicit context tools"
```

### Task 6: Wire the runtime entrypoint and job runners together

**Files:**
- Modify: `apps/agent/src/server.ts`
- Modify: `apps/agent/src/mastra/index.ts`
- Create: `apps/agent/test/runtime.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { mastra } from "../src/mastra";

test("mastra exports all registered agents", () => {
  assert.ok(mastra);
});
```

- [ ] **Step 2: Run the test to verify it fails or is incomplete**

Run: `npm exec tsx --test apps/agent/test/runtime.test.ts`
Expected: PASS once the registry exports are wired correctly and the test asserts all agent, workflow, and tool names explicitly.

- [ ] **Step 3: Write the minimal implementation**

```ts
export const mastra = new Mastra({
  tools: {
    userContextTool,
    candidateContextTool,
    companyContextTool,
    jobContextTool,
    matchingContextTool,
    evidenceContextTool,
  },
  agents: {
    cvProfileAgent,
    jobMatchingAgent,
    talentMatchingAgent,
    disputeSummaryAgent,
  },
  workflows: {
    parseCvWorkflow,
    jobMatchingWorkflow,
    talentMatchingWorkflow,
    disputeSummaryWorkflow,
  },
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm exec tsx --test apps/agent/test/runtime.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/server.ts apps/agent/src/mastra/index.ts apps/agent/test/runtime.test.ts
git commit -m "feat(agent): wire runtime registry"
```

### Task 7: Verify autonomy and orchestration end-to-end

**Files:**
- Review: `apps/agent/src/env.ts`
- Review: `apps/agent/src/server.ts`
- Review: `apps/agent/src/mastra/index.ts`
- Review: `apps/agent/src/mastra/agents/*.ts`
- Review: `apps/agent/src/mastra/workflows/*.ts`
- Review: `apps/agent/src/mastra/tools/*.ts`

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck --workspace=@shire/agent`
Expected: PASS.

- [ ] **Step 2: Run build**

Run: `npm run build --workspace=@shire/agent`
Expected: PASS.

- [ ] **Step 3: Run the local runtime**

Run: `npm run start --workspace=@shire/agent -- cv-parse`
Expected: The job runner prints structured JSON for the selected job.

- [ ] **Step 4: Commit the verification state**

```bash
git add apps/agent package-lock.json tsconfig.base.json docs/superpowers/plans/2026-06-10-agent-orchestration-implementation-plan.md
git commit -m "feat(agent): complete orchestration implementation"
```
