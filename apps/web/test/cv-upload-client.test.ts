import assert from "node:assert/strict";
import test from "node:test";

import { mapAgentProfileToForm } from "../lib/cv-profile-draft";
import {
  normalizeCvJob,
  submitCandidateCv,
} from "../lib/cv-upload-client";

test("maps a completed agent profile into editable web form values", () => {
  const result = mapAgentProfileToForm(
    {
      fullName: "Maya Okafor",
      headline: "Senior Frontend Engineer",
      summary: "Builds accessible product interfaces.",
      skills: ["TypeScript", "React"],
      preferredRoles: ["Frontend Engineer"],
      location: "Lagos",
      githubUrl: "https://github.com/maya",
      expectedSalary: { min: 90000, max: 120000, currency: "USD" },
    },
    {
      displayName: "Existing",
      bio: "Existing profile text",
      skills: ["Old"],
      roleTargets: ["Old role"],
      experienceLevel: "JUNIOR",
      languages: ["English"],
      timezone: "GMT+1",
      visibility: "PRIVATE",
      xUrl: "https://x.com/maya",
    },
  );

  assert.equal(result.displayName, "Maya Okafor");
  assert.equal(result.bio, "Builds accessible product interfaces.");
  assert.deepEqual(result.skills, ["TypeScript", "React"]);
  assert.deepEqual(result.roleTargets, ["Frontend Engineer"]);
  assert.equal(result.experienceLevel, "SENIOR");
  assert.equal(result.salaryExpectation, "USD 90,000 - 120,000");
  assert.deepEqual(result.languages, ["English"]);
  assert.equal(result.timezone, "GMT+1");
  assert.equal(result.visibility, "PRIVATE");
  assert.equal(result.xUrl, "https://x.com/maya");
});

test("normalizes delayed, completed, and failed job states", () => {
  assert.equal(
    normalizeCvJob({
      id: "job-1",
      status: "delayed",
      attempts: 1,
      maxAttempts: 3,
      nextRetryAt: "2026-06-15T10:00:00.000Z",
    }).status,
    "delayed",
  );
  assert.equal(
    normalizeCvJob({
      id: "job-1",
      status: "completed",
      result: { profile: { skills: ["React"] } },
    }).status,
    "completed",
  );
  assert.deepEqual(
    normalizeCvJob({
      id: "job-1",
      status: "failed",
      error: { message: "Provider unavailable" },
    }),
    {
      status: "failed",
      message: "Provider unavailable",
    },
  );
});

test("submits only the selected file and bearer token", async () => {
  let forwarded: RequestInit | undefined;
  const result = await submitCandidateCv(
    new File(["%PDF-1.7"], "cv.pdf", { type: "application/pdf" }),
    "privy-token",
    async (_input, init) => {
      forwarded = init;
      return Response.json({ jobId: "job-1", status: "queued" }, { status: 202 });
    },
  );

  assert.deepEqual(result, { jobId: "job-1", status: "queued" });
  assert.equal(
    new Headers(forwarded?.headers).get("authorization"),
    "Bearer privy-token",
  );
  assert.ok((forwarded?.body as FormData).get("file") instanceof File);
  assert.equal((forwarded?.body as FormData).get("candidateId"), null);
});
