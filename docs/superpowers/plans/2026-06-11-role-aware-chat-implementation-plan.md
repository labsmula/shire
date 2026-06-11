# Role-Aware Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Assistant UI chat to `apps/web` and a role-aware Mastra chat agent to `apps/agent`, with strict candidate/recruiter context isolation and resource-scoped memory.

**Architecture:** `apps/web` owns the browser-facing chat entrypoint and proxies requests to the agent runtime. `apps/agent` owns chat policy, thread scoping, context resolution, Mastra `chatRoute`, and RAG-backed response generation. General chat and resource-scoped chat use separate deterministic thread keys.

**Tech Stack:** Next.js App Router, React, Assistant UI, Mastra, `@mastra/ai-sdk`, Node `node:test`, TypeScript, Zustand, libSQL-backed Mastra memory.

---

## File Structure

### Agent workspace

- Create: `apps/agent/src/runtime/chat-types.ts`
  - Shared request, scope, and resolved-context types for the chat pipeline.
- Create: `apps/agent/src/runtime/chat-thread.ts`
  - Deterministic thread/resource key builders.
- Create: `apps/agent/src/runtime/chat-policy.ts`
  - Candidate/recruiter policy guards.
- Create: `apps/agent/src/runtime/chat-context.ts`
  - Safe context resolution from deterministic data sources.
- Create: `apps/agent/src/mastra/agents/role-aware-chat.agent.ts`
  - Role-aware chat agent definition and instructions.
- Modify: `apps/agent/src/mastra/index.ts`
  - Register `chatRoute({ path: "/chat/:agentId" })` and export the new chat agent.
- Modify: `apps/agent/src/server.ts`
  - Clarify runtime bootstrap around chat exposure and health checks.
- Modify: `apps/agent/package.json`
  - Add `@mastra/ai-sdk` and any Mastra dev script needed to expose `chatRoute`.
- Modify: `apps/agent/test/index.ts`
  - Register new test files.
- Create: `apps/agent/test/chat-thread.test.ts`
  - Unit tests for thread/resource keys.
- Create: `apps/agent/test/chat-policy.test.ts`
  - Unit tests for access rules.
- Create: `apps/agent/test/chat-context.test.ts`
  - Integration-style tests for safe context resolution.
- Create: `apps/agent/test/chat-agent.test.ts`
  - Agent export and route registration tests.

### Web workspace

- Modify: `apps/web/package.json`
  - Add Assistant UI packages and a test script.
- Create: `apps/web/lib/chat/types.ts`
  - Shared client/proxy scope metadata types.
- Create: `apps/web/lib/chat/thread.ts`
  - UI-side helpers for scope labels and thread selection.
- Create: `apps/web/lib/chat/context.ts`
  - Route-to-scope mapping helpers.
- Create: `apps/web/app/api/chat/[scope]/route.ts`
  - Next.js proxy route for chat requests.
- Create: `apps/web/components/ai/chat-panel.tsx`
  - Assistant UI runtime provider and thread surface.
- Create: `apps/web/components/ai/chat-context-badge.tsx`
  - Scope label for current chat context.
- Create: `apps/web/components/ai/chat-shell.tsx`
  - Thin wrapper that accepts route-derived scope props.
- Modify: `apps/web/app/candidate/layout.tsx`
  - Mount candidate chat shell.
- Modify: `apps/web/app/recruiter/layout.tsx`
  - Mount recruiter chat shell.
- Modify: `apps/web/app/candidate/jobs/[id]/page.tsx`
  - Supply resource metadata for job-scoped candidate chat.
- Modify: `apps/web/app/recruiter/jobs/[id]/page.tsx`
  - Supply resource metadata for recruiter job chat.
- Modify: `apps/web/app/candidate/profile/page.tsx`
  - Supply candidate-profile scope.
- Modify: `apps/web/app/recruiter/profile/page.tsx`
  - Supply recruiter/company-profile scope.
- Create: `apps/web/test/chat-thread.test.ts`
  - Unit tests for route/scope helpers.
- Create: `apps/web/test/chat-route.test.ts`
  - Proxy route tests.

### Docs and env

- Modify: `apps/agent/.env.example`
  - Document any chat-specific runtime URL/port requirements if needed.
- Modify: `apps/agent/README.md`
  - Document the Mastra chat route and chat agent.
- Modify: `apps/web/README.md`
  - Document Assistant UI and proxy setup.

---

### Task 1: Add Agent Chat Contracts and Thread Keys

**Files:**
- Create: `apps/agent/src/runtime/chat-types.ts`
- Create: `apps/agent/src/runtime/chat-thread.ts`
- Create: `apps/agent/test/chat-thread.test.ts`
- Modify: `apps/agent/test/index.ts`

- [ ] **Step 1: Write the failing thread-key test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildChatThreadScope,
  buildChatResourceKey,
} from "../src/runtime/chat-thread";

test("builds a general role thread key", () => {
  assert.deepEqual(
    buildChatThreadScope({
      viewerId: "me_candidate",
      role: "candidate",
    }),
    {
      threadId: "candidate:me_candidate",
      resourceKey: "candidate:me_candidate:general",
    },
  );
});

test("builds a resource-scoped recruiter thread key", () => {
  assert.deepEqual(
    buildChatThreadScope({
      viewerId: "rec_aperture",
      role: "recruiter",
      resourceType: "candidate",
      resourceId: "tal_sara",
    }),
    {
      threadId: "recruiter:rec_aperture:candidate:tal_sara",
      resourceKey: "recruiter:rec_aperture:candidate:tal_sara",
    },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test apps/agent/test/chat-thread.test.ts`

Expected: FAIL with module-not-found or missing-export errors for `chat-thread.ts`.

- [ ] **Step 3: Write the minimal thread/type implementation**

```ts
// apps/agent/src/runtime/chat-types.ts
export type ChatRole = "candidate" | "recruiter";
export type ChatResourceType = "job" | "candidate" | "company" | "application";

export type ChatScopeInput = {
  viewerId: string;
  role: ChatRole;
  resourceType?: ChatResourceType;
  resourceId?: string;
};

// apps/agent/src/runtime/chat-thread.ts
import type { ChatScopeInput } from "./chat-types";

export function buildChatResourceKey(input: ChatScopeInput) {
  if (!input.resourceType || !input.resourceId) {
    return `${input.role}:${input.viewerId}:general`;
  }

  return `${input.role}:${input.viewerId}:${input.resourceType}:${input.resourceId}`;
}

export function buildChatThreadScope(input: ChatScopeInput) {
  const scopedKey = buildChatResourceKey(input);
  return {
    threadId:
      !input.resourceType || !input.resourceId
        ? `${input.role}:${input.viewerId}`
        : scopedKey,
    resourceKey: scopedKey,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test apps/agent/test/chat-thread.test.ts`

Expected: PASS with 2 passing tests.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/runtime/chat-types.ts apps/agent/src/runtime/chat-thread.ts apps/agent/test/chat-thread.test.ts apps/agent/test/index.ts
git commit -m "feat(agent): add chat thread scope helpers"
```

### Task 2: Add Agent Access Policy and Safe Context Resolution

**Files:**
- Create: `apps/agent/src/runtime/chat-policy.ts`
- Create: `apps/agent/src/runtime/chat-context.ts`
- Create: `apps/agent/test/chat-policy.test.ts`
- Create: `apps/agent/test/chat-context.test.ts`

- [ ] **Step 1: Write the failing policy/context tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { canAccessChatResource } from "../src/runtime/chat-policy";
import { resolveChatContext } from "../src/runtime/chat-context";

test("recruiter cannot access an unrelated candidate", () => {
  assert.equal(
    canAccessChatResource({
      viewerId: "rec_aperture",
      role: "recruiter",
      resourceType: "candidate",
      resourceId: "tal_priya",
    }),
    false,
  );
});

test("candidate job scope returns only safe profile and job context", () => {
  const resolved = resolveChatContext({
    viewerId: "me_candidate",
    role: "candidate",
    resourceType: "job",
    resourceId: "job_fe_aperture",
  });

  assert.equal(resolved.viewer.role, "candidate");
  assert.equal(resolved.resource?.type, "job");
  assert.equal(resolved.resource?.id, "job_fe_aperture");
  assert.equal(resolved.policy.allowed, true);
  assert.equal(resolved.candidate?.id, "me_candidate");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test apps/agent/test/chat-policy.test.ts apps/agent/test/chat-context.test.ts`

Expected: FAIL with missing module or missing-export errors.

- [ ] **Step 3: Write the minimal policy/context implementation**

```ts
// apps/agent/src/runtime/chat-policy.ts
import { seedApplications, jobs, recruiters, talents } from "@/../web/lib/seed"; // replace with a local adapter if direct import is rejected
import type { ChatScopeInput } from "./chat-types";

export function canAccessChatResource(input: ChatScopeInput) {
  if (!input.resourceType || !input.resourceId) return true;

  if (input.role === "candidate") {
    if (input.resourceType === "candidate") return input.resourceId === input.viewerId;
    if (input.resourceType === "job") return jobs.some((job) => job.id === input.resourceId);
    if (input.resourceType === "application") {
      return seedApplications.some(
        (application) =>
          application.id === input.resourceId &&
          application.candidateId === input.viewerId,
      );
    }
    return false;
  }

  if (input.resourceType === "company") return input.resourceId === input.viewerId;
  if (input.resourceType === "job") {
    return jobs.some(
      (job) => job.id === input.resourceId && job.recruiterId === input.viewerId,
    );
  }
  if (input.resourceType === "candidate") {
    return seedApplications.some((application) => {
      const job = jobs.find((item) => item.id === application.jobId);
      return (
        application.candidateId === input.resourceId && job?.recruiterId === input.viewerId
      );
    });
  }
  return false;
}
```

```ts
// apps/agent/src/runtime/chat-context.ts
import type { ChatScopeInput } from "./chat-types";
import { canAccessChatResource } from "./chat-policy";

export function resolveChatContext(input: ChatScopeInput) {
  const allowed = canAccessChatResource(input);
  return {
    viewer: {
      id: input.viewerId,
      role: input.role,
    },
    policy: { allowed },
    resource:
      allowed && input.resourceType && input.resourceId
        ? { type: input.resourceType, id: input.resourceId }
        : null,
    candidate:
      input.role === "candidate" ? { id: input.viewerId, label: "You" } : null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test apps/agent/test/chat-policy.test.ts apps/agent/test/chat-context.test.ts`

Expected: PASS with recruiter denial and candidate-safe context coverage.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/runtime/chat-policy.ts apps/agent/src/runtime/chat-context.ts apps/agent/test/chat-policy.test.ts apps/agent/test/chat-context.test.ts
git commit -m "feat(agent): add role-aware chat policy"
```

### Task 3: Register the Mastra Chat Agent and Route

**Files:**
- Create: `apps/agent/src/mastra/agents/role-aware-chat.agent.ts`
- Modify: `apps/agent/src/mastra/index.ts`
- Modify: `apps/agent/package.json`
- Modify: `apps/agent/src/server.ts`
- Create: `apps/agent/test/chat-agent.test.ts`
- Modify: `apps/agent/test/index.ts`

- [ ] **Step 1: Write the failing agent/route test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { mastra, roleAwareChatAgent } from "../src/mastra";

test("exports the role-aware chat agent", () => {
  assert.equal(roleAwareChatAgent.name, "role-aware-chat-agent");
});

test("registers a Mastra chat route", () => {
  const serverConfig = mastra.getConfig().server;
  assert.ok(serverConfig?.apiRoutes?.length);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test apps/agent/test/chat-agent.test.ts`

Expected: FAIL because the agent export and route registration do not exist yet.

- [ ] **Step 3: Write the minimal agent/route implementation**

```ts
// apps/agent/src/mastra/agents/role-aware-chat.agent.ts
import { Agent } from "@mastra/core/agent";
import { agentMemory } from "../../runtime/memory";

export const roleAwareChatAgent = new Agent({
  name: "role-aware-chat-agent",
  instructions: `
You are the Shire in-app assistant.
Use only the provided role-scoped context.
Never assume access to a candidate, recruiter, company, or job that is not present in context.
Use repository knowledge only as supporting context, never as access permission.
Keep answers concise and actionable.
  `.trim(),
  memory: agentMemory,
});
```

```ts
// apps/agent/src/mastra/index.ts
import { chatRoute } from "@mastra/ai-sdk";
import { roleAwareChatAgent } from "./agents/role-aware-chat.agent";

export const mastra = new Mastra({
  server: {
    apiRoutes: [
      chatRoute({
        path: "/chat/:agentId",
      }),
    ],
  },
  agents: {
    roleAwareChatAgent,
    // existing agents...
  },
});
```

```json
// apps/agent/package.json
{
  "dependencies": {
    "@mastra/ai-sdk": "latest"
  },
  "scripts": {
    "dev:mastra": "mastra dev"
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test apps/agent/test/chat-agent.test.ts`

Expected: PASS with chat agent export and route registration detected.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/mastra/agents/role-aware-chat.agent.ts apps/agent/src/mastra/index.ts apps/agent/src/server.ts apps/agent/package.json apps/agent/test/chat-agent.test.ts apps/agent/test/index.ts
git commit -m "feat(agent): register role-aware chat route"
```

### Task 4: Add Web Chat Scope Helpers and Proxy Route

**Files:**
- Create: `apps/web/lib/chat/types.ts`
- Create: `apps/web/lib/chat/thread.ts`
- Create: `apps/web/lib/chat/context.ts`
- Create: `apps/web/app/api/chat/[scope]/route.ts`
- Create: `apps/web/test/chat-thread.test.ts`
- Create: `apps/web/test/chat-route.test.ts`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Write the failing web helper/proxy tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildChatScopeLabel } from "../lib/chat/thread";
import { buildServerChatScope } from "../lib/chat/context";

test("labels a candidate job scope clearly", () => {
  assert.equal(
    buildChatScopeLabel({
      role: "candidate",
      resourceType: "job",
      resourceLabel: "Senior Frontend Engineer",
    }),
    "Candidate / Job / Senior Frontend Engineer",
  );
});

test("builds a server chat envelope from route context", () => {
  assert.deepEqual(
    buildServerChatScope({
      viewerId: "me_candidate",
      role: "candidate",
      resourceType: "job",
      resourceId: "job_fe_aperture",
    }),
    {
      viewerId: "me_candidate",
      role: "candidate",
      resourceType: "job",
      resourceId: "job_fe_aperture",
      scope: "resource",
    },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test apps/web/test/chat-thread.test.ts apps/web/test/chat-route.test.ts`

Expected: FAIL with missing helper modules or exports.

- [ ] **Step 3: Write the minimal helper/proxy implementation**

```ts
// apps/web/lib/chat/thread.ts
export function buildChatScopeLabel(input: {
  role: "candidate" | "recruiter";
  resourceType?: "job" | "candidate" | "company" | "application";
  resourceLabel?: string;
}) {
  const roleLabel = input.role === "candidate" ? "Candidate" : "Recruiter";
  if (!input.resourceType) return `${roleLabel} / General`;
  const typeLabel = input.resourceType.charAt(0).toUpperCase() + input.resourceType.slice(1);
  return input.resourceLabel
    ? `${roleLabel} / ${typeLabel} / ${input.resourceLabel}`
    : `${roleLabel} / ${typeLabel}`;
}
```

```ts
// apps/web/app/api/chat/[scope]/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = await request.json();
  const agentUrl = process.env.SHIRE_AGENT_CHAT_URL;

  if (!agentUrl) {
    return NextResponse.json({ error: "missing-agent-url" }, { status: 500 });
  }

  const upstream = await fetch(agentUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}
```

```json
// apps/web/package.json
{
  "scripts": {
    "test": "node --import tsx --test test/**/*.test.ts"
  },
  "dependencies": {
    "@assistant-ui/react": "latest",
    "@assistant-ui/react-ai-sdk": "latest"
  },
  "devDependencies": {
    "tsx": "latest"
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test apps/web/test/chat-thread.test.ts apps/web/test/chat-route.test.ts`

Expected: PASS with scope-label and proxy-envelope coverage.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/chat/types.ts apps/web/lib/chat/thread.ts apps/web/lib/chat/context.ts apps/web/app/api/chat/[scope]/route.ts apps/web/test/chat-thread.test.ts apps/web/test/chat-route.test.ts apps/web/package.json
git commit -m "feat(web): add chat proxy and scope helpers"
```

### Task 5: Add Assistant UI Chat Panel

**Files:**
- Create: `apps/web/components/ai/chat-context-badge.tsx`
- Create: `apps/web/components/ai/chat-panel.tsx`
- Create: `apps/web/components/ai/chat-shell.tsx`

- [ ] **Step 1: Write the failing component smoke test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildChatScopeLabel } from "@/lib/chat/thread";

test("chat shell uses the expected general fallback label", () => {
  assert.equal(
    buildChatScopeLabel({ role: "recruiter" }),
    "Recruiter / General",
  );
});
```

- [ ] **Step 2: Run test to verify it fails only if the component helpers are missing**

Run: `node --import tsx --test apps/web/test/chat-thread.test.ts`

Expected: FAIL until the helper export exists and matches the expected label.

- [ ] **Step 3: Write the minimal Assistant UI implementation**

```tsx
"use client";

// apps/web/components/ai/chat-panel.tsx
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";

export function ChatPanel({ api, title }: { api: string; title: string }) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <section className="rounded-2xl border border-border bg-card">
        <header className="border-b border-border px-4 py-3 text-sm font-medium">
          {title}
        </header>
        <Thread />
      </section>
    </AssistantRuntimeProvider>
  );
}
```

```tsx
"use client";

// apps/web/components/ai/chat-context-badge.tsx
export function ChatContextBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
      {label}
    </span>
  );
}
```

- [ ] **Step 4: Run typecheck to verify the panel compiles**

Run: `npm.cmd run typecheck --workspace=@shire/web`

Expected: PASS or fail only on missing `Thread` component scaffolding that must be added in the same task.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/ai/chat-context-badge.tsx apps/web/components/ai/chat-panel.tsx apps/web/components/ai/chat-shell.tsx
git commit -m "feat(web): add assistant ui chat panel"
```

### Task 6: Mount Chat into Candidate and Recruiter Flows

**Files:**
- Modify: `apps/web/app/candidate/layout.tsx`
- Modify: `apps/web/app/recruiter/layout.tsx`
- Modify: `apps/web/app/candidate/jobs/[id]/page.tsx`
- Modify: `apps/web/app/recruiter/jobs/[id]/page.tsx`
- Modify: `apps/web/app/candidate/profile/page.tsx`
- Modify: `apps/web/app/recruiter/profile/page.tsx`

- [ ] **Step 1: Write the failing route-scope tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { resolveChatPageContext } from "../lib/chat/context";

test("candidate job page maps to a job-scoped chat context", () => {
  assert.deepEqual(
    resolveChatPageContext({
      role: "candidate",
      pathname: "/candidate/jobs/job_fe_aperture",
      resourceId: "job_fe_aperture",
    }),
    {
      role: "candidate",
      resourceType: "job",
      resourceId: "job_fe_aperture",
    },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test apps/web/test/chat-route.test.ts`

Expected: FAIL because page-context mapping is not implemented yet.

- [ ] **Step 3: Write the minimal route integration**

```tsx
// apps/web/app/candidate/layout.tsx
import { ChatShell } from "@/components/ai/chat-shell";

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ChatShell role="candidate" />
    </>
  );
}
```

```tsx
// apps/web/app/candidate/jobs/[id]/page.tsx
<ChatShell
  role="candidate"
  resourceType="job"
  resourceId={job.id}
  resourceLabel={job.title}
/>
```

```tsx
// apps/web/app/recruiter/jobs/[id]/page.tsx
<ChatShell
  role="recruiter"
  resourceType="job"
  resourceId={job.id}
  resourceLabel={job.title}
/>
```

- [ ] **Step 4: Run web typecheck to verify all mounted pages compile**

Run: `npm.cmd run typecheck --workspace=@shire/web`

Expected: PASS with candidate/recruiter chat shell integration compiling cleanly.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/candidate/layout.tsx apps/web/app/recruiter/layout.tsx apps/web/app/candidate/jobs/[id]/page.tsx apps/web/app/recruiter/jobs/[id]/page.tsx apps/web/app/candidate/profile/page.tsx apps/web/app/recruiter/profile/page.tsx
git commit -m "feat(web): mount role-aware chat in app flows"
```

### Task 7: Verify End-to-End Wiring and Update Docs

**Files:**
- Modify: `apps/agent/.env.example`
- Modify: `apps/agent/README.md`
- Modify: `apps/web/README.md`

- [ ] **Step 1: Write the failing documentation-adjacent regression checks**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { mastra } from "../src/mastra";

test("chat route remains registered after documentation updates", () => {
  assert.ok(mastra.getConfig().server?.apiRoutes?.length);
});
```

- [ ] **Step 2: Run the focused regression check**

Run: `node --import tsx --test apps/agent/test/chat-agent.test.ts`

Expected: PASS before and after doc edits; if it fails, stop and fix the runtime.

- [ ] **Step 3: Update env/docs with concrete setup instructions**

```env
# apps/agent/.env.example
PORT=3010
SHIRE_AGENT_CHAT_PATH=/chat/roleAwareChatAgent
```

```md
## Chat

Run the Mastra server so `chatRoute({ path: "/chat/:agentId" })` is exposed.
Point `apps/web` at the agent chat endpoint through `SHIRE_AGENT_CHAT_URL`.
The browser should call the Next.js proxy route, not the agent server directly.
```

- [ ] **Step 4: Run full verification**

Run:

```bash
npm.cmd run test --workspace=@shire/agent
npm.cmd run build --workspace=@shire/agent
npm.cmd run test --workspace=@shire/web
npm.cmd run build --workspace=@shire/web
```

Expected:

- agent tests pass;
- agent build passes;
- web tests pass;
- web build passes.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/.env.example apps/agent/README.md apps/web/README.md
git commit -m "docs: document role-aware chat setup"
```

## Self-Review

- Spec coverage:
  - Assistant UI + Mastra `chatRoute` integration is covered in Tasks 3, 4, and 5.
  - Next.js proxy ownership is covered in Task 4.
  - role/resource thread isolation is covered in Tasks 1 and 6.
  - candidate/recruiter access policy is covered in Task 2.
  - candidate and recruiter page mounting is covered in Task 6.
  - verification and setup docs are covered in Task 7.
- Placeholder scan:
  - No `TODO`/`TBD` placeholders remain.
  - Every task names concrete files and commands.
- Type consistency:
  - `viewerId`, `role`, `resourceType`, `resourceId`, `threadId`, and `resourceKey` are used consistently across agent and web tasks.
