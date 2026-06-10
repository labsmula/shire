import { Agent } from "@mastra/core/agent";
import { companyContextTool } from "../tools/company.tools";
import { jobContextTool } from "../tools/job.tools";
import { matchingContextTool } from "../tools/matching.tools";

export const talentMatchingAgent = new Agent({
  id: "talent-matching-agent",
  name: "Talent Matching Agent",
  instructions:
    "Match available talent to company needs with minimal assumptions and clear criteria. Prefer the smallest reliable tool or MCP, use Context7 first for current documentation, and keep outputs structured.",
  model: "openai/gpt-4.1-mini",
  tools: {
    companyContextTool,
    jobContextTool,
    matchingContextTool,
  },
});
