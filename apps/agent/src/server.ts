import { env } from "./env";
import { mastra } from "./mastra";
import { pathToFileURL } from "node:url";
import { jobRegistry, resolveJobName } from "./runtime/job-registry";

export function getRuntimeBootstrapOutput() {
  return {
    status: "runtime-ready",
    nodeEnv: env.nodeEnv,
    port: env.port,
    jobs: Object.keys(jobRegistry),
  } as const;
}

export async function runServer(argv: readonly string[] = process.argv.slice(2)) {
  const jobName = resolveJobName(argv[0]);

  if (jobName) {
    const result = await jobRegistry[jobName]();
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  void mastra;

  const bootstrapOutput = getRuntimeBootstrapOutput();
  console.log(JSON.stringify(bootstrapOutput, null, 2));
  return bootstrapOutput;
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  runServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
