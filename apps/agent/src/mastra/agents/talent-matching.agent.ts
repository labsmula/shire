import { Agent } from "@mastra/core/agent";
import { agentModel } from "../../runtime/model";
import { companyContextTool } from "../tools/company.tools";
import { jobContextTool } from "../tools/job.tools";
import { matchingContextTool } from "../tools/matching.tools";

export const talentMatchingAgent = new Agent({
  id: "talent-matching-agent",
  name: "Talent Matching Agent",
  instructions:
    "Match available talent to company needs with minimal assumptions and clear criteria. Prefer the smallest reliable tool or MCP, use Context7 first for current documentation, and keep outputs structured.",
  model: agentModel,
  tools: {
    companyContextTool,
    jobContextTool,
    matchingContextTool,
  },
});
