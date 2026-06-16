import assert from "node:assert/strict";
import test from "node:test";

import {
  getActiveRoleState,
  roleDestination,
  switchableRoles,
} from "../lib/role-client";

const candidateProfile = {
  displayName: "Candidate One",
  bio: "Builds web3 products.",
  skills: ["TypeScript"],
  roleTargets: ["Frontend Engineer"],
  experienceLevel: "SENIOR",
  languages: ["English"],
  visibility: "PUBLIC",
};

const recruiterProfile = {
  companyName: "Shire Labs",
  companyDescription: "Hiring infrastructure.",
  verificationStatus: "UNVERIFIED",
  trustLevel: 30,
  completedHires: 0,
  disputeCount: 0,
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("candidate profile activates only candidate", async () => {
  const fetcher: typeof fetch = async (input) => {
    if (String(input).endsWith("/candidate")) {
      return jsonResponse(200, { profile: candidateProfile });
    }
    return jsonResponse(404, { error: "profile-not-found" });
  };

  assert.deepEqual(await getActiveRoleState("token", fetcher), {
    candidate: true,
    recruiter: false,
  });
});

test("both profiles activate candidate and recruiter", async () => {
  const fetcher: typeof fetch = async (input) => {
    if (String(input).endsWith("/candidate")) {
      return jsonResponse(200, { profile: candidateProfile });
    }
    return jsonResponse(200, { profile: recruiterProfile });
  };

  assert.deepEqual(await getActiveRoleState("token", fetcher), {
    candidate: true,
    recruiter: true,
  });
});

test("missing recruiter profile routes to recruiter onboarding", () => {
  assert.equal(
    roleDestination("recruiter", { candidate: true, recruiter: false }),
    "/onboarding/recruiter",
  );
});

test("admin is not exposed as a user-switchable role", () => {
  assert.deepEqual(switchableRoles, ["candidate", "recruiter"]);
});
