import assert from "node:assert/strict";
import test from "node:test";

import {
  chatRouteVersion,
  mastra,
  roleAwareChatAgent,
} from "../src/mastra";

test("exports the role-aware chat agent", () => {
  assert.equal(roleAwareChatAgent.id, "role-aware-chat-agent");
  assert.equal(roleAwareChatAgent.name, "Role-Aware Chat Agent");
});

test("loads the Mastra registry with the chat route registration", () => {
  assert.ok(mastra);
});

test("uses the AI SDK v6 chat protocol required by Assistant UI", () => {
  assert.equal(chatRouteVersion, "v6");
});
