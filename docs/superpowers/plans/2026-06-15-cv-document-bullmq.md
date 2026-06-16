# CV Document BullMQ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Process PDF and DOCX CV uploads from the web app through an authenticated agent API and a durable BullMQ worker with delayed retries.

**Architecture:** The web app authenticates the candidate and proxies multipart uploads to the internal agent. The agent extracts bounded text in memory and enqueues the existing typed `cv-parse` payload through a BullMQ adapter. Processor logic remains queue-neutral, while BullMQ owns persistence, retry timing, state polling, and graceful shutdown.

**Tech Stack:** TypeScript, Next.js route handlers, Express, BullMQ, Redis, Multer, pdf-parse, Mammoth, Privy Node SDK, Node test runner.

---

### Task 1: Runtime Configuration and Dependencies

**Files:**
- Modify: `apps/agent/package.json`
- Modify: `apps/web/package.json`
- Modify: `apps/agent/src/env.ts`
- Modify: `apps/agent/.env.example`
- Modify: `apps/agent/test/env.test.ts`
- Modify: `package-lock.json`

- [ ] Add failing environment tests for `REDIS_URL`, service token, queue name, retry attempts, backoff, and file-size defaults.
- [ ] Run `node --import tsx --test apps/agent/test/env.test.ts` and confirm the new assertions fail.
- [ ] Add BullMQ, Redis, multipart, PDF, DOCX, and Privy server dependencies.
- [ ] Implement environment parsing with production fail-fast validation deferred to runtime bootstrap so unit tests can inject dependencies.
- [ ] Run the environment test and agent typecheck.
- [ ] Commit as `chore(agent): add durable CV processing dependencies`.

### Task 2: CV Document Validation and Extraction

**Files:**
- Create: `apps/agent/src/runtime/cv-document.ts`
- Create: `apps/agent/test/cv-document.test.ts`
- Modify: `apps/agent/test/index.ts`

- [ ] Write failing tests for PDF signature validation, DOCX ZIP validation, unsupported MIME type, file size, empty extraction, and text length.
- [ ] Run the focused test and confirm imports or assertions fail.
- [ ] Implement `CvDocumentError`, signature checks, extractor dependency injection, sanitization, and bounded extraction.
- [ ] Run focused tests, agent typecheck, and existing CV tests.
- [ ] Commit as `feat(agent): extract bounded CV documents`.

### Task 3: BullMQ Queue and Retry Semantics

**Files:**
- Create: `apps/agent/src/runtime/jobs/job-errors.ts`
- Create: `apps/agent/src/runtime/jobs/bullmq-job-queue.ts`
- Create: `apps/agent/test/job-errors.test.ts`
- Create: `apps/agent/test/bullmq-job-queue.test.ts`
- Modify: `apps/agent/src/runtime/jobs/job-contracts.ts`
- Modify: `apps/agent/test/index.ts`

- [ ] Write failing tests for retry classification, three attempts, exponential backoff at 5000 ms, BullMQ state mapping, ownership checks, and delayed retry timestamps.
- [ ] Run focused tests and confirm the missing adapter behavior fails.
- [ ] Implement retry classification and translate permanent processor failures to BullMQ `UnrecoverableError`.
- [ ] Implement the BullMQ queue/worker runtime with injectable Queue/Worker-compatible factories for Redis-free unit tests.
- [ ] Run focused tests and agent typecheck.
- [ ] Commit as `feat(agent): add BullMQ job retries`.

### Task 4: Agent Multipart and Status API

**Files:**
- Create: `apps/agent/src/runtime/internal-auth.ts`
- Create: `apps/agent/test/internal-auth.test.ts`
- Modify: `apps/agent/src/server.ts`
- Modify: `apps/agent/test/jobs-http.test.ts`
- Modify: `apps/agent/test/index.ts`

- [ ] Write failing tests for service-token rejection, multipart PDF enqueue, validation errors, owned status polling, and ownership mismatch.
- [ ] Run focused tests and confirm the new routes fail.
- [ ] Implement constant-time bearer validation and Multer memory upload handling.
- [ ] Wire default server startup to BullMQ while retaining injected in-memory dependencies for unit tests.
- [ ] Close BullMQ resources on HTTP shutdown and return `503` for queue backend failures.
- [ ] Run agent HTTP tests, full agent tests, and typecheck.
- [ ] Commit as `feat(agent): accept authenticated CV uploads`.

### Task 5: Web App Proxy and Candidate Identity

**Files:**
- Create: `apps/web/lib/server/candidate-identity.ts`
- Create: `apps/web/app/api/candidates/me/cv/route.ts`
- Create: `apps/web/app/api/candidates/me/cv/jobs/[jobId]/route.ts`
- Create: `apps/web/test/cv-route.test.ts`
- Modify: `apps/web/package.json`
- Modify: `package-lock.json`

- [ ] Write failing tests proving the browser candidate ID is ignored, demo identity is `me_candidate`, the service token is forwarded, status polling includes the server-resolved candidate ID, and unavailable agents return `502`.
- [ ] Run the focused web route tests and confirm missing route imports fail.
- [ ] Implement production Privy token verification behind injected identity resolution and the existing demo fallback.
- [ ] Implement upload and status proxies using server-only environment variables.
- [ ] Run focused tests, web typecheck, lint, and build.
- [ ] Commit as `feat(web): proxy candidate CV processing`.

### Task 6: Documentation and End-to-End Verification

**Files:**
- Modify: `apps/agent/README.md`
- Modify: `apps/agent/.env.example`
- Create: `apps/web/.env.example`
- Modify: `docs/superpowers/plans/2026-06-15-cv-document-bullmq.md`

- [ ] Document Redis, service-token, upload, polling, Postman, and retry behavior.
- [ ] Add an opt-in BullMQ integration test command using external `REDIS_URL`.
- [ ] Run agent tests, web tests, both typechecks, agent build, web build, and `git diff --check`.
- [ ] Mark every plan item complete only after its command passes.
- [ ] Commit as `docs: document durable CV processing`.
