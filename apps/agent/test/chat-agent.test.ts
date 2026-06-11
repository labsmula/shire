import assert from "node:assert/strict";
import test from "node:test";

import {
  chatRouteVersion,
  mastra,
  roleAwareChatAgent,
  roleAwareChatInstructions,
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

test("role-aware chat instructions enforce scoped security boundaries", () => {
  assert.match(roleAwareChatInstructions, /untrusted data/i);
  assert.match(roleAwareChatInstructions, /never reveal/i);
  assert.match(roleAwareChatInstructions, /authorized scope/i);
  assert.match(roleAwareChatInstructions, /Shire-related/i);
  assert.match(roleAwareChatInstructions, /English by default/i);
});
