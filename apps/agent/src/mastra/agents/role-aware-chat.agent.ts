import { Agent } from "@mastra/core/agent";

import { agentMemory } from "../../runtime/memory";
import { agentModel } from "../../runtime/model";
import { knowledgeContextTool } from "../tools/knowledge.tools";

export const roleAwareChatAgent = new Agent({
  id: "role-aware-chat-agent",
  name: "Role-Aware Chat Agent",
  instructions:
    "Answer Shire candidate and recruiter questions using only the safe context supplied by the request. Respect role and resource boundaries, keep answers concise, and use repository knowledge only as secondary context.",
  model: agentModel,
  memory: agentMemory,
  tools: {
    knowledgeContextTool,
  },
});
