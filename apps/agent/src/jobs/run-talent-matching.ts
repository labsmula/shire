import { talentMatchingAgent } from "../mastra/agents/talent-matching.agent";
import { talentMatchingWorkflow } from "../mastra/workflows/talent-matching.workflow";

export async function runTalentMatchingJob() {
  return {
    job: "talent-matching",
    agent: talentMatchingAgent.id,
    workflow: talentMatchingWorkflow.id,
  };
}
