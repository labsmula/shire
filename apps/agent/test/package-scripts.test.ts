import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("runtime scripts load the agent .env file", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  ) as {
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
  };

  for (const scriptName of [
    "dev",
    "start",
    "job:cv-parse",
    "job:job-matching",
    "job:knowledge-sync",
    "job:talent-matching",
    "job:onchain-sync",
    "job:dispute-summary",
  ]) {
    assert.match(
      packageJson.scripts[scriptName],
      /--env-file-if-exists=\.env/,
      `${scriptName} must load apps/agent/.env`,
    );
  }

  for (const dependency of [
    "@ai-sdk/openai",
    "@ai-sdk/openai-compatible",
    "@openrouter/ai-sdk-provider",
  ]) {
    assert.equal(packageJson.dependencies[dependency], undefined);
  }
});
