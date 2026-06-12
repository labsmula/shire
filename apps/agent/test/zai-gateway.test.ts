import assert from "node:assert/strict";
import test from "node:test";

import { zaiGateway } from "../src/mastra/gateways/zai.gateway";

test("registers the Z.ai gateway with the expected provider metadata", async () => {
  const providers = await zaiGateway.fetchProviders();

  assert.equal(zaiGateway.id, "zai");
  assert.equal(zaiGateway.name, "Z.ai");
  assert.equal(providers.zai.name, "Z.ai");
  assert.deepEqual(providers.zai.models, ["glm-4.5-air", "glm-4.5"]);
});
