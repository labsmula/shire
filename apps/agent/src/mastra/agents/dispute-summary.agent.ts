import { Agent } from "@mastra/core/agent";
import { evidenceContextTool } from "../tools/evidence.tools";
import { matchingContextTool } from "../tools/matching.tools";
import { userContextTool } from "../tools/user.tools";

export const disputeSummaryAgent = new Agent({
  id: "dispute-summary-agent",
  name: "Dispute Summary Agent",
  instructions:
    "Summarize disputes, evidence, and next actions with a neutral tone. Prefer the smallest reliable tool or MCP, use Context7 first for current documentation, and keep the result concise and traceable.",
  model: "openai/gpt-4.1-mini",
  tools: {
    userContextTool,
    evidenceContextTool,
    matchingContextTool,
  },
});
