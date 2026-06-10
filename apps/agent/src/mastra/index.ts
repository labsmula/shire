import { Mastra } from "@mastra/core";
import { shireOrchestrator } from "./agents/shire-orchestrator";

export const mastra = new Mastra({
  agents: { shireOrchestrator },
});
