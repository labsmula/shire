import { Mastra } from "@mastra/core";
import { cvProfileAgent } from "./agents/cv-profile.agent";
import { disputeSummaryAgent } from "./agents/dispute-summary.agent";
import { jobMatchingAgent } from "./agents/job-matching.agent";
import { talentMatchingAgent } from "./agents/talent-matching.agent";
import { parseCvWorkflow } from "./workflows/parse-cv.workflow";
import { jobMatchingWorkflow } from "./workflows/job-matching.workflow";
import { talentMatchingWorkflow } from "./workflows/talent-matching.workflow";
import { disputeSummaryWorkflow } from "./workflows/dispute-summary.workflow";
import { userContextTool } from "./tools/user.tools";
import { candidateContextTool } from "./tools/candidate.tools";
import { companyContextTool } from "./tools/company.tools";
import { jobContextTool } from "./tools/job.tools";
import { matchingContextTool } from "./tools/matching.tools";
import { evidenceContextTool } from "./tools/evidence.tools";

export { parseCvWorkflowId } from "./workflows/parse-cv.workflow";
export { jobMatchingWorkflowId } from "./workflows/job-matching.workflow";
export { talentMatchingWorkflowId } from "./workflows/talent-matching.workflow";
export { disputeSummaryWorkflowId } from "./workflows/dispute-summary.workflow";
export { userContextToolId } from "./tools/user.tools";
export { candidateContextToolId } from "./tools/candidate.tools";
export { companyContextToolId } from "./tools/company.tools";
export { jobContextToolId } from "./tools/job.tools";
export { matchingContextToolId } from "./tools/matching.tools";
export { evidenceContextToolId } from "./tools/evidence.tools";

export const mastra = new Mastra({
  tools: {
    userContextTool,
    candidateContextTool,
    companyContextTool,
    jobContextTool,
    matchingContextTool,
    evidenceContextTool,
  },
  agents: {
    cvProfileAgent,
    jobMatchingAgent,
    talentMatchingAgent,
    disputeSummaryAgent,
  },
  workflows: {
    parseCvWorkflow,
    jobMatchingWorkflow,
    talentMatchingWorkflow,
    disputeSummaryWorkflow,
  },
});

export {
  cvProfileAgent,
  disputeSummaryAgent,
  jobMatchingAgent,
  talentMatchingAgent,
  parseCvWorkflow,
  jobMatchingWorkflow,
  talentMatchingWorkflow,
  disputeSummaryWorkflow,
  userContextTool,
  candidateContextTool,
  companyContextTool,
  jobContextTool,
  matchingContextTool,
  evidenceContextTool,
};
