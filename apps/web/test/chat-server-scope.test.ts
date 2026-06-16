import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAuthenticatedChatContext,
  ChatScopeAuthorizationError,
} from "../lib/chat/server-scope";
import type { CandidateProfile, RecruiterProfile } from "../lib/types";

const candidateProfile: CandidateProfile = {
  displayName: "M. Zaky Arisandhi",
  bio: "Frontend engineer focused on product interfaces.",
  skills: ["TypeScript", "React"],
  roleTargets: ["Senior Frontend Engineer"],
  experienceLevel: "SENIOR",
  location: "Jakarta",
  timezone: "Asia/Jakarta",
  languages: ["Indonesian", "English"],
  salaryExpectation: "$120k",
  visibility: "PUBLIC",
};

const recruiterProfile: RecruiterProfile = {
  companyName: "Aperture Labs",
  companyWebsite: "https://aperture.xyz",
  companyDescription: "Onchain identity tooling.",
  contactEmail: "talent@aperture.xyz",
  location: "Remote",
  verificationStatus: "VERIFIED",
  trustLevel: 88,
  completedHires: 12,
  disputeCount: 0,
};

test("candidate and recruiter resources differ for one user", () => {
  const userId = "user-001";
  const candidate = buildAuthenticatedChatContext({
    userId,
    role: "candidate",
    profile: candidateProfile,
    requestedScope: { role: "candidate" },
  });
  const recruiter = buildAuthenticatedChatContext({
    userId,
    role: "recruiter",
    profile: recruiterProfile,
    requestedScope: { role: "recruiter" },
  });

  assert.equal(candidate.memory.resource, "user:user-001:role:candidate");
  assert.equal(recruiter.memory.resource, "user:user-001:role:recruiter");
  assert.notEqual(candidate.scope.resourceKey, recruiter.scope.resourceKey);
});

test("two users never receive the same resource or thread keys", () => {
  const first = buildAuthenticatedChatContext({
    userId: "user-001",
    role: "candidate",
    profile: candidateProfile,
    requestedScope: { role: "candidate", resourceType: "candidate" },
  });
  const second = buildAuthenticatedChatContext({
    userId: "user-002",
    role: "candidate",
    profile: candidateProfile,
    requestedScope: { role: "candidate", resourceType: "candidate" },
  });

  assert.notEqual(first.memory.resource, second.memory.resource);
  assert.notEqual(first.memory.thread, second.memory.thread);
});

test("browser viewerId and memory keys are ignored", () => {
  const context = buildAuthenticatedChatContext({
    userId: "user-real",
    role: "candidate",
    profile: candidateProfile,
    requestedScope: {
      role: "candidate",
      resourceType: "candidate",
      resourceId: "candidate-001",
      viewerId: "candidate-001",
      threadId: "candidate:candidate-001:general",
      resourceKey: "candidate:candidate-001:general",
    },
  });

  assert.equal(context.scope.viewerId, "user-real");
  assert.equal(context.scope.resourceId, "user-real");
  assert.equal(context.memory.resource, "user:user-real:role:candidate");
  assert.equal(context.memory.thread, "user:user-real:role:candidate:candidate:user-real");
});

test("candidate trusted context includes the saved display name", () => {
  const context = buildAuthenticatedChatContext({
    userId: "user-001",
    role: "candidate",
    profile: candidateProfile,
    requestedScope: { role: "candidate" },
  });

  assert.match(context.system, /M\. Zaky Arisandhi/);
  assert.doesNotMatch(context.system, /\$120k/);
});

test("an inactive role is rejected", () => {
  assert.throws(
    () =>
      buildAuthenticatedChatContext({
        userId: "user-001",
        role: "recruiter",
        profile: null,
        requestedScope: { role: "recruiter" },
      }),
    (error) =>
      error instanceof ChatScopeAuthorizationError &&
      error.code === "role-not-active",
  );
});

test("candidate self-profile scope uses the authenticated user UUID", () => {
  const context = buildAuthenticatedChatContext({
    userId: "user-001",
    role: "candidate",
    profile: candidateProfile,
    requestedScope: {
      role: "candidate",
      resourceType: "candidate",
      resourceId: "candidate-001",
      resourceLabel: "Browser Name",
    },
  });

  assert.equal(context.scope.resourceId, "user-001");
  assert.equal(context.scope.resourceLabel, "M. Zaky Arisandhi");
  assert.equal(context.scope.threadId, "user:user-001:role:candidate:candidate:user-001");
});
