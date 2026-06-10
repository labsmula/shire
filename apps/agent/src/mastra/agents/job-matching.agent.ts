import { Agent } from "@mastra/core/agent";
import { candidateContextTool } from "../tools/candidate.tools";
import { jobContextTool } from "../tools/job.tools";
import { matchingContextTool } from "../tools/matching.tools";

export const jobMatchingAgent = new Agent({
  id: "job-matching-agent",
  name: "Job Matching Agent",
  instructions:
    "Match candidate profiles to jobs with explicit, explainable signals. Prefer the smallest reliable tool or MCP, use Context7 first for current documentation, and keep the reasoning structured.",
  model: "openai/gpt-4.1-mini",
  tools: {
    candidateContextTool,
    jobContextTool,
    matchingContextTool,
  },
});
