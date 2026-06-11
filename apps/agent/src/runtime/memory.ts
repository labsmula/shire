import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";

import { env } from "../env";

function ensureLocalDatabaseDirectory(url: string) {
  if (!url.startsWith("file:")) {
    return;
  }

  mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
}

export function createAgentMemoryConfig(input: { agentMemoryUrl: string }) {
  ensureLocalDatabaseDirectory(input.agentMemoryUrl);

  return {
    storage: new LibSQLStore({
      id: "shire-agent-memory",
      url: input.agentMemoryUrl,
    }),
    options: {
      lastMessages: 10,
      workingMemory: {
        enabled: true,
      },
      generateTitle: false,
    },
  } as const;
}

export function createAgentMemory(input: { agentMemoryUrl: string }) {
  return new Memory(createAgentMemoryConfig(input));
}

export const agentMemory = createAgentMemory(env);
