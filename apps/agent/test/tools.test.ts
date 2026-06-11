import assert from "node:assert/strict";
import test from "node:test";

import {
  candidateContextTool,
  candidateContextToolId,
} from "../src/mastra/tools/candidate.tools";
import {
  companyContextTool,
  companyContextToolId,
} from "../src/mastra/tools/company.tools";
import {
  evidenceContextTool,
  evidenceContextToolId,
} from "../src/mastra/tools/evidence.tools";
import {
  jobContextTool,
  jobContextToolId,
} from "../src/mastra/tools/job.tools";
import {
  matchingContextTool,
  matchingContextToolId,
} from "../src/mastra/tools/matching.tools";
import {
  knowledgeContextTool,
  knowledgeContextToolId,
} from "../src/mastra/tools/knowledge.tools";
import {
  userContextTool,
  userContextToolId,
} from "../src/mastra/tools/user.tools";

test("context tool ids stay stable", () => {
  assert.equal(userContextTool.id, userContextToolId);
  assert.equal(candidateContextTool.id, candidateContextToolId);
  assert.equal(companyContextTool.id, companyContextToolId);
  assert.equal(jobContextTool.id, jobContextToolId);
  assert.equal(matchingContextTool.id, matchingContextToolId);
  assert.equal(evidenceContextTool.id, evidenceContextToolId);
  assert.equal(knowledgeContextTool.id, knowledgeContextToolId);
});

test("knowledge context tool requires a bounded query", () => {
  assert.deepEqual(knowledgeContextTool.inputSchema?.parse({
    query: "matching rules",
    topK: 5,
  }), {
    query: "matching rules",
    topK: 5,
  });
  assert.throws(() =>
    knowledgeContextTool.inputSchema?.parse({ query: "", topK: 11 }),
  );
});

test("user context tool returns a structured user context", async () => {
  const output = await userContextTool.execute?.({
    userId: "user-123",
    scope: "cv-review",
  });

  assert.deepEqual(userContextTool.outputSchema?.parse(output), {
    contextType: "user",
    userId: "user-123",
    scope: "cv-review",
    status: "ready",
  });
});

test("candidate context tool returns a structured candidate context", async () => {
  const output = await candidateContextTool.execute?.({
    candidateId: "candidate-123",
    scope: "matching",
  });

  assert.deepEqual(candidateContextTool.outputSchema?.parse(output), {
    contextType: "candidate",
    candidateId: "candidate-123",
    scope: "matching",
    status: "ready",
  });
});

test("company context tool returns a structured company context", async () => {
  const output = await companyContextTool.execute?.({
    companyId: "company-123",
    scope: "talent-review",
  });

  assert.deepEqual(companyContextTool.outputSchema?.parse(output), {
    contextType: "company",
    companyId: "company-123",
    scope: "talent-review",
    status: "ready",
  });
});

test("job context tool returns a structured job context", async () => {
  const output = await jobContextTool.execute?.({
    jobId: "job-123",
    scope: "candidate-review",
  });

  assert.deepEqual(jobContextTool.outputSchema?.parse(output), {
    contextType: "job",
    jobId: "job-123",
    scope: "candidate-review",
    status: "ready",
  });
});

test("matching context tool returns a deterministic pairwise context", async () => {
  const output = await matchingContextTool.execute?.({
    subjectId: "candidate-123",
    targetId: "job-123",
  });

  assert.deepEqual(matchingContextTool.outputSchema?.parse(output), {
    contextType: "matching",
    subjectId: "candidate-123",
    targetId: "job-123",
    relationshipKey: "candidate-123:job-123",
    score: 75,
    status: "ready",
  });
});

test("evidence context tool returns a structured evidence context", async () => {
  const output = await evidenceContextTool.execute?.({
    referenceId: "evidence-123",
    note: "ticket-note",
  });

  assert.deepEqual(evidenceContextTool.outputSchema?.parse(output), {
    contextType: "evidence",
    referenceId: "evidence-123",
    note: "ticket-note",
    status: "ready",
  });
});
