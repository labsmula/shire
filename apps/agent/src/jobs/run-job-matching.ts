import { jobMatchingAgent } from "../mastra/agents/job-matching.agent";
import { jobMatchingWorkflow } from "../mastra/workflows/job-matching.workflow";
import { jobRunnerData } from "../runtime/data/runtime-data";

export async function runJobMatchingJob() {
  return {
    job: "job-matching",
    agent: jobMatchingAgent.id,
    workflow: jobMatchingWorkflow.id,
    data: jobRunnerData["job-matching"],
  };
}
