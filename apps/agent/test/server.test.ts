import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { env } from "../src/env";
import {
  createRuntimeHttpServer,
  getRuntimeBootstrapOutput,
  runServer,
} from "../src/server";
import { jobRegistry, resolveJobName } from "../src/runtime/job-registry";
import { jobRunnerData } from "../src/runtime/data/runtime-data";

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

  assert.equal(result.job, "cv-parse");
  assert.equal(result.agent, "cv-profile-agent");
  assert.equal(result.workflow, "parse-cv-workflow");
  assert.deepEqual(result.data, jobRunnerData["cv-parse"]);
  assert.equal(result.routing.workload, "cv-normalization");
  assert.deepEqual(result.usage, []);
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

test("runtime http server exposes health and not-found responses", async () => {
  const server = createRuntimeHttpServer();

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, () => resolve());
  });

  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");

    const healthResponse = await fetch(
      `http://127.0.0.1:${address.port}/health`,
    );
    assert.equal(healthResponse.status, 200);
    assert.deepEqual(
      await healthResponse.json(),
      getRuntimeBootstrapOutput(),
    );

    const notFoundResponse = await fetch(
      `http://127.0.0.1:${address.port}/missing`,
    );
    assert.equal(notFoundResponse.status, 404);
    assert.deepEqual(await notFoundResponse.json(), {
      status: "not-found",
      path: "/missing",
    });
  } finally {
    server.close();
    await once(server, "close");
  }
});
