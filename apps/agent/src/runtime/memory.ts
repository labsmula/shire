import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Memory } from "@mastra/memory";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";

import { env } from "../env";
import { createEmbeddingModel } from "./embeddings";

export interface AgentMemoryRuntimeConfig {
  agentMemoryUrl: string;
  agentKnowledgeUrl: string;
  agentKnowledgeIndex: string;
  embeddingModel: string;
  embeddingBaseUrl: string;
  embeddingEnabled: boolean;
  workingMemoryEnabled: boolean;
}

export interface AgentMemoryConfig {
  storage: LibSQLStore;
  vector?: LibSQLVector;
  embedder?: ReturnType<typeof createEmbeddingModel>;
  options: {
    lastMessages: number;
    semanticRecall:
      | false
      | {
          topK: number;
          messageRange: {
            before: number;
            after: number;
          };
          scope: "resource";
        };
    workingMemory:
      | false
      | {
          enabled: true;
          scope: "resource";
          template: string;
        };
    generateTitle: false;
  };
}

export const agentMemoryTemplate = [
  "# Shire Runtime Memory",
  "",
  "Store only approved facts, confirmed preferences, and concise workflow summaries.",
  "Never store raw CV text, full evidence files, secrets, or unconfirmed inferences.",
  "",
  "## Identity",
  "- User ID:",
  "- Candidate ID:",
  "- Company ID:",
  "- Job ID:",
  "",
  "## Approved Facts",
  "- Confirmed facts:",
  "- Permissions and scope:",
  "",
  "## Preferences",
  "- Communication style:",
  "- Preferred output format:",
  "",
  "## Session State",
  "- Current topic:",
  "- Open questions:",
  "- Next action:",
].join("\n");

function ensureLocalDatabaseDirectory(url: string) {
  if (!url.startsWith("file:")) {
    return;
  }

  mkdirSync(dirname(resolve(url.slice("file:".length))), { recursive: true });
}

function normalizeAgentMemoryRuntime(
  runtime: Partial<AgentMemoryRuntimeConfig> | undefined = env,
): AgentMemoryRuntimeConfig {
  return {
    agentMemoryUrl: runtime.agentMemoryUrl?.trim() || env.agentMemoryUrl,
    agentKnowledgeUrl: runtime.agentKnowledgeUrl?.trim() || env.agentKnowledgeUrl,
    agentKnowledgeIndex:
      runtime.agentKnowledgeIndex?.trim() || env.agentKnowledgeIndex,
    embeddingModel: runtime.embeddingModel?.trim() || env.embeddingModel,
    embeddingBaseUrl:
      runtime.embeddingBaseUrl?.trim() || env.embeddingBaseUrl,
    embeddingEnabled:
      runtime.embeddingEnabled ?? env.embeddingEnabled,
    workingMemoryEnabled:
      runtime.workingMemoryEnabled ?? env.workingMemoryEnabled,
  };
}

export function buildAgentMemoryConfig(
  runtime: Partial<AgentMemoryRuntimeConfig> | undefined = env,
): AgentMemoryConfig {
  const normalizedRuntime = normalizeAgentMemoryRuntime(runtime);

  const embeddingConfig = normalizedRuntime.embeddingEnabled
    ? {
        vector: new LibSQLVector({
          id: normalizedRuntime.agentKnowledgeIndex,
          url: normalizedRuntime.agentKnowledgeUrl,
        }),
        embedder: createEmbeddingModel({
          modelId: normalizedRuntime.embeddingModel,
          baseUrl: normalizedRuntime.embeddingBaseUrl,
        }),
      }
    : {};

  return {
    storage: new LibSQLStore({
      id: "shire-agent-memory-storage",
      url: normalizedRuntime.agentMemoryUrl,
    }),
    ...embeddingConfig,
    options: {
      lastMessages: 20,
      semanticRecall: normalizedRuntime.embeddingEnabled
        ? {
            topK: 5,
            messageRange: {
              before: 2,
              after: 1,
            },
            scope: "resource" as const,
          }
        : false,
      workingMemory: normalizedRuntime.workingMemoryEnabled
        ? {
            enabled: true as const,
            scope: "resource" as const,
            template: agentMemoryTemplate,
          }
        : false,
      generateTitle: false,
    },
  };
}

export const createAgentMemoryConfig = buildAgentMemoryConfig;

function createMemoryStorageDirectories(runtime: AgentMemoryRuntimeConfig) {
  ensureLocalDatabaseDirectory(runtime.agentMemoryUrl);
  ensureLocalDatabaseDirectory(runtime.agentKnowledgeUrl);
}

export function createAgentMemory(
  runtime: Partial<AgentMemoryRuntimeConfig> | undefined = env,
) {
  const normalizedRuntime = normalizeAgentMemoryRuntime(runtime);
  createMemoryStorageDirectories(normalizedRuntime);

  return new Memory(buildAgentMemoryConfig(normalizedRuntime) as any);
}

export const agentMemory = createAgentMemory(env);
