import test from "node:test";
import assert from "node:assert/strict";
import { env } from "../src/env";
import { getRuntimeBootstrapOutput, runServer } from "../src/server";
import { jobRegistry, resolveJobName } from "../src/runtime/job-registry";

test("resolves known job names", () => {
  assert.equal(resolveJobName("cv-parse"), "cv-parse");
  assert.equal(resolveJobName("job-matching"), "job-matching");
  assert.equal(resolveJobName("talent-matching"), "talent-matching");
  assert.equal(resolveJobName("onchain-sync"), "onchain-sync");
  assert.equal(resolveJobName("dispute-summary"), "dispute-summary");
});

test("returns null for unknown job names", () => {
  assert.equal(resolveJobName("unknown"), null);
});

test("dispatches a known job from cli args", async () => {
  const result = await runServer(["cv-parse"]);

  assert.deepEqual(result, {
    job: "cv-parse",
    agent: "cv-profile-agent",
    workflow: "parse-cv-workflow",
  });
});

test("returns bootstrap output when no job is provided", async () => {
  const result = await runServer([]);

  assert.deepEqual(result, getRuntimeBootstrapOutput());
  assert.deepEqual(result, {
    status: "runtime-ready",
    nodeEnv: env.nodeEnv,
    port: env.port,
    jobs: Object.keys(jobRegistry),
  });
});
