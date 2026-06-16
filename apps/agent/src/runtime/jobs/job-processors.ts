import type {
  JobPayloadMap,
  JobResult,
  JobResultMap,
  ProcessableJob,
} from "./job-contracts";
import type { JobExecutionContext } from "./job-processor";
import { cvParseProcessor } from "./cv-parse.processor";
import { onchainSyncProcessor } from "./onchain-sync.processor";

type CvParseProcessor = (
  payload: JobPayloadMap["cv-parse"],
  context: JobExecutionContext,
) => Promise<JobResultMap["cv-parse"]>;

export function createJobProcessors(
  dependencies: {
    processCvParse: CvParseProcessor;
  } = {
    processCvParse: (payload, context) =>
      cvParseProcessor.process(payload, context),
  },
) {
  return {
    async process(
      job: ProcessableJob,
      context: Omit<JobExecutionContext, "jobId">,
    ): Promise<JobResult> {
      const executionContext = { ...context, jobId: job.id };

      if (job.name === "onchain-sync") {
        return onchainSyncProcessor.process(
          job.payload as { chain: "Celo" },
          executionContext,
        );
      }

      return dependencies.processCvParse(
        job.payload as { candidateId: string; rawCv: string },
        executionContext,
      );
    },
  };
}
