import { cvProfileAgent } from "../mastra/agents/cv-profile.agent";
import { parseCvWorkflow } from "../mastra/workflows/parse-cv.workflow";
import { jobRunnerData } from "../runtime/data/runtime-data";

export async function runCvParseJob() {
  return {
    job: "cv-parse",
    agent: cvProfileAgent.id,
    workflow: parseCvWorkflow.id,
    data: jobRunnerData["cv-parse"],
  };
}
