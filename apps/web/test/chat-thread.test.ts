import assert from "node:assert/strict";
import test from "node:test";

import { buildChatScopeLabel } from "../lib/chat/thread";

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

test("labels a recruiter general scope clearly", () => {
  assert.equal(
    buildChatScopeLabel({
      role: "recruiter",
    }),
    "Recruiter / General",
  );
});
