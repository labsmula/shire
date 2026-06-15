# CV Upload Review UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared candidate CV upload experience that polls BullMQ jobs and prefills the existing editable profile form.

**Architecture:** A pure mapper converts the agent draft to web form values, and a small API client handles upload and status polling contracts. A client component owns file/status state and emits a completed draft to profile/onboarding pages, which pass it to the existing React Hook Form through a resettable prop.

**Tech Stack:** Next.js App Router, React, React Hook Form, Privy React auth, TypeScript, Node test runner.

---

### Task 1: CV Result Mapping and API Client

**Files:**
- Create: `apps/web/lib/cv-profile-draft.ts`
- Create: `apps/web/lib/cv-upload-client.ts`
- Create: `apps/web/test/cv-upload-client.test.ts`

- [ ] Write failing tests for profile mapping, seniority inference, existing-field preservation, upload response parsing, delayed status, completed status, and failed status.
- [ ] Run the focused test and confirm missing modules fail.
- [ ] Implement the pure mapper and typed fetch helpers.
- [ ] Run focused tests and web typecheck.
- [ ] Commit as `feat(web): map CV jobs into profile drafts`.

### Task 2: Shared Upload and Review Component

**Files:**
- Create: `apps/web/components/profile/candidate-cv-upload.tsx`
- Modify: `apps/web/components/profile/candidate-profile-form.tsx`
- Modify: `apps/web/app/candidate/profile/page.tsx`
- Modify: `apps/web/app/onboarding/candidate/page.tsx`

- [ ] Add a resettable `draft` prop to `CandidateProfileForm`.
- [ ] Build file selection, PDF/DOCX constraints, upload, one-second polling, retry status, failure state, and completed review messaging.
- [ ] Obtain a Privy access token only when Privy is enabled.
- [ ] Render the shared component above the form in both candidate pages.
- [ ] Run web tests, typecheck, lint changed files, and build.
- [ ] Commit as `feat(web): add candidate CV upload review`.

### Task 3: Documentation and Final Verification

**Files:**
- Modify: `apps/agent/README.md`
- Modify: `docs/superpowers/plans/2026-06-15-cv-upload-review-ui.md`

- [ ] Document that one agent process runs both HTTP and BullMQ worker.
- [ ] Run web tests, agent tests, both typechecks, both builds, and `git diff --check`.
- [ ] Commit as `docs: document candidate CV review flow`.
