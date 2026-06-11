import { env } from "./env";
import { mastra } from "./mastra";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { logger } from "./runtime/logger";
import { jobRegistry, resolveJobName } from "./runtime/job-registry";

const runtimeLogger = logger.child({ component: "runtime" });

export function getRuntimeBootstrapOutput() {
  return {
    status: "runtime-ready",
    nodeEnv: env.nodeEnv,
    port: env.port,
    jobs: Object.keys(jobRegistry),
  } as const;
}

export function createRuntimeHttpServer() {
  return createServer((request, response) => {
    const bootstrapOutput = getRuntimeBootstrapOutput();

    if (request.url === "/health" || request.url === "/ready") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(bootstrapOutput, null, 2));
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(
      JSON.stringify(
        {
          status: "not-found",
          path: request.url ?? "/",
        },
        null,
        2,
      ),
    );
  });
}

export async function runServer(argv: readonly string[] = process.argv.slice(2)) {
  const jobName = resolveJobName(argv[0]);

  runtimeLogger.info(
    {
      argv,
      jobName,
      nodeEnv: env.nodeEnv,
      port: env.port,
      autonomyMode: env.autonomyMode,
    },
    "agent runtime received input",
  );

  if (jobName) {
    runtimeLogger.info({ jobName }, "dispatching job");

    try {
      const result = await jobRegistry[jobName]();

      if ("agent" in result && "workflow" in result) {
        runtimeLogger.info(
          {
            jobName,
            agent: result.agent,
            workflow: result.workflow,
          },
          "job completed",
        );
      } else if ("status" in result && "chain" in result) {
        runtimeLogger.info(
          {
            jobName,
            status: result.status,
            chain: result.chain,
          },
          "job completed",
        );
      } else {
        runtimeLogger.info(
          {
            jobName,
            indexedDocuments: result.indexedDocuments,
            indexedChunks: result.indexedChunks,
            indexName: result.indexName,
          },
          "job completed",
        );
      }

      console.log(JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      runtimeLogger.error({ err: error, jobName }, "job failed");
      throw error;
    }
  }

  void mastra;

  const bootstrapOutput = getRuntimeBootstrapOutput();
  runtimeLogger.info(
    {
      jobs: bootstrapOutput.jobs,
      nodeEnv: bootstrapOutput.nodeEnv,
      port: bootstrapOutput.port,
    },
    "Shire agent runtime ready",
  );
  console.log(JSON.stringify(bootstrapOutput, null, 2));
  return bootstrapOutput;
}

export async function startRuntimeService() {
  void mastra;

  const bootstrapOutput = getRuntimeBootstrapOutput();
  const server = createRuntimeHttpServer();

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(env.port, () => resolve());
  });

  runtimeLogger.info(
    {
      jobs: bootstrapOutput.jobs,
      nodeEnv: bootstrapOutput.nodeEnv,
      port: bootstrapOutput.port,
      healthcheck: `http://localhost:${env.port}/health`,
    },
    "Shire agent service listening",
  );

  return server;
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const argv = process.argv.slice(2);

  if (resolveJobName(argv[0])) {
    runServer(argv).catch((error) => {
      runtimeLogger.error({ err: error }, "agent runtime crashed");
      process.exitCode = 1;
    });
  } else {
    startRuntimeService().catch((error) => {
      runtimeLogger.error({ err: error }, "agent runtime crashed");
      process.exitCode = 1;
    });
  }
}
