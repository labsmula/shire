# Agent Context Split and English-Only Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the `.agent` knowledge base into focused English-only context docs for schema, auth, and onchain workflows, while making the agent process rules explicit about using the right skill, MCP, and Context7.

**Architecture:** Keep `context/architecture.md` as the high-level index, but move domain-specific detail into `context/schemas/`, `context/auth/`, and `context/onchain/`. Add a process doc that tells future agents to choose the best skill or MCP for the task and to use Context7 first for external library and API documentation.

**Tech Stack:** Markdown documentation, repo-local agent instructions.

---

### Task 1: Convert the agent documentation to English

**Files:**
- Modify: `.agent/README.md`
- Modify: `.agent/context/README.md`
- Modify: `.agent/context/architecture.md`
- Modify: `.agent/context/agent/README.md`
- Modify: `.agent/context/agent/orchestration.md`
- Modify: `.agent/context/agent/runtime-context.md`
- Modify: `.agent/context/agent/workflows.md`
- Modify: `.agent/context/agent/matching-pipeline.md`
- Modify: `.agent/context/agent/api.md`
- Modify: `.agent/references/README.md`
- Modify: `.agent/decisions/README.md`
- Modify: `.agent/decisions/log.md`
- Modify: `.agent/tasks/README.md`
- Modify: `.agent/tasks/current.md`
- Modify: `.agent/tasks/backlog.md`
- Modify: `.agent/tasks/open-questions.md`
- Modify: `.agent/archive/README.md`

- [ ] **Step 1: Replace remaining Indonesian prose with English**

- [ ] **Step 2: Keep code snippets and file paths intact**

- [ ] **Step 3: Re-read all `.agent` markdown and confirm the language is consistently English**

### Task 2: Split shared schema context into focused docs

**Files:**
- Create: `.agent/context/schemas/README.md`
- Create: `.agent/context/schemas/candidate-profile-draft.md`
- Create: `.agent/context/schemas/matching-output.md`
- Create: `.agent/context/schemas/onboarding.md`
- Create: `.agent/context/schemas/company.md`
- Create: `.agent/context/schemas/job.md`
- Modify: `.agent/context/architecture.md`

- [ ] **Step 1: Extract section 21 into schema-specific documents**

- [ ] **Step 2: Replace the architecture section with a pointer to `context/schemas/README.md`**

- [ ] **Step 3: Keep schema definitions readable and self-contained**

### Task 3: Split auth context into focused docs

**Files:**
- Create: `.agent/context/auth/README.md`
- Create: `.agent/context/auth/flow.md`
- Create: `.agent/context/auth/mode-and-onboarding.md`
- Create: `.agent/context/auth/source-priority.md`
- Create: `.agent/context/auth/privy.md`
- Create: `.agent/context/auth/minipay.md`
- Modify: `.agent/context/architecture.md`

- [ ] **Step 1: Extract authentication and mode logic into auth docs**

- [ ] **Step 2: Replace the architecture auth section with a pointer to `context/auth/README.md`**

- [ ] **Step 3: Preserve the wallet identity and multi-mode rules exactly**

### Task 4: Split onchain context into focused docs

**Files:**
- Create: `.agent/context/onchain/README.md`
- Create: `.agent/context/onchain/contract-design.md`
- Create: `.agent/context/onchain/staking-flow.md`
- Create: `.agent/context/onchain/sync.md`
- Create: `.agent/context/onchain/security.md`
- Modify: `.agent/context/architecture.md`

- [ ] **Step 1: Extract contract, staking, sync, and onchain security into onchain docs**

- [ ] **Step 2: Replace the architecture onchain sections with a pointer to `context/onchain/README.md`**

- [ ] **Step 3: Keep the security constraints explicit and easy to scan**

### Task 5: Add process rules for skills, MCP, and Context7

**Files:**
- Create: `.agent/context/process.md`
- Modify: `.agent/README.md`
- Modify: `.agent/context/README.md`
- Modify: `.agent/context/agent/README.md`

- [ ] **Step 1: Document that agents should prefer the best matching skill for the task**

- [ ] **Step 2: Document that agents should use the correct MCP when it is the right source**

- [ ] **Step 3: Document that Context7 is the first stop for current library, SDK, API, and CLI docs**

- [ ] **Step 4: Link the process doc from the top-level `.agent` index and context index**

### Task 6: Verify the final structure

**Files:**
- Review: `.agent/**`

- [ ] **Step 1: Scan for non-English prose**

- [ ] **Step 2: Confirm every index points to the correct child docs**

- [ ] **Step 3: Confirm no important detail was lost during extraction**

- [ ] **Step 4: Summarize the resulting structure for the user**
