import { disputeSummaryAgent } from "../mastra/agents/dispute-summary.agent";
import { disputeSummaryWorkflow } from "../mastra/workflows/dispute-summary.workflow";

export async function runDisputeSummaryJob() {
  return {
    job: "dispute-summary",
    agent: disputeSummaryAgent.id,
    workflow: disputeSummaryWorkflow.id,
  };
}
