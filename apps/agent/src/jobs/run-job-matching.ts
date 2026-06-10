import { jobMatchingAgent } from "../mastra/agents/job-matching.agent";
import { jobMatchingWorkflow } from "../mastra/workflows/job-matching.workflow";

export async function runJobMatchingJob() {
  return {
    job: "job-matching",
    agent: jobMatchingAgent.id,
    workflow: jobMatchingWorkflow.id,
  };
}
