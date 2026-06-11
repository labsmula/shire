import { jobMatchingAgent } from "../mastra/agents/job-matching.agent";
import { jobMatchingWorkflow } from "../mastra/workflows/job-matching.workflow";
import { jobRunnerData } from "../runtime/data/runtime-data";
import { createJobRouting } from "../runtime/job-routing";

export async function runJobMatchingJob() {
  return {
    job: "job-matching",
    agent: jobMatchingAgent.id,
    workflow: jobMatchingWorkflow.id,
    data: jobRunnerData["job-matching"],
    routing: createJobRouting("job-matching"),
    usage: [],
  };
}
