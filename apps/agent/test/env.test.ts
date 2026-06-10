import assert from "node:assert/strict";
import test from "node:test";

import { createEnv } from "../src/env";

test("defaults autonomy mode to semi-autonomous", () => {
  const env = createEnv({});

  assert.equal(env.autonomyMode, "semi-autonomous");
});

test("parses a valid autonomy mode from SHIRE_AUTONOMY_MODE", () => {
  const env = createEnv({ SHIRE_AUTONOMY_MODE: "fully-autonomous" });

  assert.equal(env.autonomyMode, "fully-autonomous");
});

test("rejects an invalid autonomy mode", () => {
  assert.throws(() => createEnv({ SHIRE_AUTONOMY_MODE: "wide-open" }));
});
