import { Agent } from "@mastra/core/agent";
import { candidateContextTool } from "../tools/candidate.tools";
import { evidenceContextTool } from "../tools/evidence.tools";
import { userContextTool } from "../tools/user.tools";

export const cvProfileAgent = new Agent({
  id: "cv-profile-agent",
  name: "CV Profile Agent",
  instructions:
    "Normalize CVs into structured candidate profiles. Prefer the smallest reliable tool or MCP, use Context7 first for current documentation, and keep output concise and auditable.",
  model: "openai/gpt-4.1-mini",
  tools: {
    userContextTool,
    candidateContextTool,
    evidenceContextTool,
  },
});
