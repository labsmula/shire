import { env } from "./env";
import { mastra } from "./mastra";
import { runCvParseJob } from "./jobs/run-cv-parse";
import { runDisputeSummaryJob } from "./jobs/run-dispute-summary";
import { runJobMatchingJob } from "./jobs/run-job-matching";
import { runOnchainSyncJob } from "./jobs/run-onchain-sync";
import { runTalentMatchingJob } from "./jobs/run-talent-matching";

const jobs = {
  "cv-parse": runCvParseJob,
  "job-matching": runJobMatchingJob,
  "talent-matching": runTalentMatchingJob,
  "onchain-sync": runOnchainSyncJob,
  "dispute-summary": runDisputeSummaryJob,
} as const;

type JobName = keyof typeof jobs;

async function main() {
  const jobName = process.argv[2] as JobName | undefined;

  if (jobName && jobName in jobs) {
    const result = await jobs[jobName]();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  void mastra;
  console.log(
    `Shire agent runtime ready in ${env.nodeEnv} on port ${env.port}. Jobs: ${Object.keys(jobs).join(", ")}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
