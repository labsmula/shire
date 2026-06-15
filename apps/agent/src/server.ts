import { env } from "./env";
import { mastra } from "./mastra";
import { createServer, type Server } from "node:http";
import { pathToFileURL } from "node:url";
import express from "express";
import { MastraServer } from "@mastra/express";
import { logger } from "./runtime/logger";
import { jobRegistry, resolveJobName } from "./runtime/job-registry";
import { summarizeChatRequestBody } from "./runtime/chat-request-logging";
import {
  classifyChatRequest,
  createChatFallbackStream,
} from "./runtime/chat-guard";
import { classifySecurityIndicator } from "./runtime/security-indicators";
import { enforceChatRateLimit } from "./runtime/chat-caller";
import { searchProductKnowledge } from "./runtime/knowledge";
import { enrichChatRequestWithProductKnowledge } from "./runtime/product-knowledge";
import { validateChatRequest } from "./runtime/chat-validation";
import { createInMemoryRateLimiter, type RateLimiter } from "./runtime/rate-limit";
import { guardSecurityPrompt } from "./runtime/security-guard";
import { evaluateSecurityPolicy } from "./runtime/security-policy";
import { AgentWorker } from "./runtime/jobs/agent-worker";
import { parseJobRequest } from "./runtime/jobs/job-contracts";
import type {
  JobResult,
  ProcessableJob,
} from "./runtime/jobs/job-contracts";
import { InMemoryJobQueue } from "./runtime/jobs/in-memory-job-queue";
import type { JobQueue } from "./runtime/jobs/job-queue";
import { createJobProcessors } from "./runtime/jobs/job-processors";

const runtimeLogger = logger.child({ component: "runtime" });

export type RuntimeHttpServerDependencies = {
  searchProductKnowledge?: typeof searchProductKnowledge;
  rateLimiter?: RateLimiter;
  now?: () => number;
  securityIndicatorClassifier?: typeof classifySecurityIndicator;
  securityGuard?: typeof guardSecurityPrompt;
  jobQueue?: JobQueue;
  processJob?: (
    job: ProcessableJob,
    context: { attempt: number; signal: AbortSignal },
  ) => Promise<JobResult>;
};

export function getRuntimeBootstrapOutput() {
  return {
    status: "runtime-ready",
    nodeEnv: env.nodeEnv,
    port: env.port,
    jobs: Object.keys(jobRegistry),
  } as const;
}

export async function createRuntimeHttpServer(
  dependencies: RuntimeHttpServerDependencies = {},
): Promise<Server> {
  const app = express();
  app.use(express.json());
  const jobQueue = dependencies.jobQueue ?? new InMemoryJobQueue();
  const processors = createJobProcessors();
  const worker = new AgentWorker({
    queue: jobQueue,
    process: dependencies.processJob ?? processors.process,
  });
  if (env.workerEnabled) {
    worker.start();
  }

  app.post("/jobs", async (request, response) => {
    try {
      const parsed = parseJobRequest(request.body);
      const job = await jobQueue.enqueue(parsed);
      runtimeLogger.info(
        { jobId: job.id, jobName: job.name },
        "job queued",
      );
      response.status(202).json({ jobId: job.id, status: job.status });
    } catch {
      response.status(400).json({
        status: "invalid-job-request",
        message: "Job name or payload is invalid.",
      });
    }
  });

  app.get("/jobs/:jobId", async (request, response) => {
    const job = await jobQueue.get(request.params.jobId);
    if (!job) {
      response.status(404).json({ status: "not-found" });
      return;
    }
    response.json(job);
  });

  app.use("/chat/:agentId", (request, response, next) => {
    const startedAt = Date.now();
    const agentId = request.params.agentId;

    runtimeLogger.info(
      {
        agentId,
        method: request.method,
        path: request.originalUrl,
        body: summarizeChatRequestBody(request.body),
      },
      "chat request received",
    );

    response.on("finish", () => {
      runtimeLogger.info(
        {
          agentId,
          method: request.method,
          path: request.originalUrl,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
        },
        "chat request completed",
      );

      if (response.statusCode >= 400) {
        runtimeLogger.error(
          {
            agentId,
            method: request.method,
            path: request.originalUrl,
            statusCode: response.statusCode,
            durationMs: Date.now() - startedAt,
          },
          "chat request failed",
        );
      }
    });

    next();
  });

  app.use("/chat/:agentId", async (request, response, next) => {
    if (
      request.method !== "POST" ||
      request.params.agentId !== "role-aware-chat-agent"
    ) {
      next();
      return;
    }

    // Validate request
    const validation = validateChatRequest(request.body, {
      maxBodyBytes: env.chatMaxBodyBytes,
      maxMessages: env.chatMaxMessages,
      maxMessageCharacters: env.chatMaxMessageCharacters,
    });

    if (!validation.valid) {
      runtimeLogger.warn(
        {
          agentId: request.params.agentId,
          reasonCode: validation.reasonCode,
        },
        "chat request blocked by validation",
      );

      response
        .status(200)
        .set({
          "cache-control": "no-cache",
          connection: "keep-alive",
          "content-type": "text/event-stream; charset=utf-8",
          "x-vercel-ai-ui-message-stream": "v1",
        })
        .send(
          createChatFallbackStream({
            decision: "out-of-scope",
            messageLength: 0,
          }),
        );
      return;
    }

    // Rate limit
    const rateLimiter = dependencies.rateLimiter ?? createInMemoryRateLimiter();
    const rateResult = await enforceChatRateLimit(
      request.body,
      {
        rateLimiter,
        now: dependencies.now,
        ip: request.ip,
      },
      env.chatRateLimitRequests,
      env.chatRateLimitWindowSeconds * 1000,
    );

    if (!rateResult.allowed) {
      runtimeLogger.warn(
        {
          agentId: request.params.agentId,
          callerKey: rateResult.callerKey,
          retryAfterSeconds: rateResult.retryAfterSeconds,
        },
        "chat request rate limited",
      );

      response
        .status(429)
        .set({
          "cache-control": "no-cache",
          connection: "keep-alive",
          "content-type": "text/event-stream; charset=utf-8",
          "x-vercel-ai-ui-message-stream": "v1",
          "retry-after": rateResult.retryAfterSeconds.toString(),
        })
        .send(
          createChatFallbackStream({
            decision: "out-of-scope",
            messageLength: 0,
          }),
        );
      return;
    }

    const securityIndicatorClassifier =
      dependencies.securityIndicatorClassifier ?? classifySecurityIndicator;
    const securityGuard = dependencies.securityGuard ?? guardSecurityPrompt;
    const existingSecurityIndicator = securityIndicatorClassifier(request.body);
    if (existingSecurityIndicator.level === "suspicious") {
      try {
        const securityGuardDecision = securityGuard(request.body);
        const securityPolicyDecision = evaluateSecurityPolicy(securityGuardDecision);

        if (securityPolicyDecision.decision === "block") {
          runtimeLogger.warn(
            {
              agentId: request.params.agentId,
              risk: securityGuardDecision.risk,
              category: securityGuardDecision.category,
              reasonCode: securityGuardDecision.reasonCode,
              detectedLanguage: securityGuardDecision.detectedLanguage,
            },
            "chat request blocked by security guard",
          );

          response
            .status(200)
            .set({
              "cache-control": "no-cache",
              connection: "keep-alive",
              "content-type": "text/event-stream; charset=utf-8",
              "x-vercel-ai-ui-message-stream": "v1",
            })
            .send(
              createChatFallbackStream({
                decision: "prompt-injection",
                messageLength: securityGuardDecision.text.length,
              }),
            );
          return;
        }
      } catch (error) {
        runtimeLogger.warn(
          {
            agentId: request.params.agentId,
            err: error,
          },
          "security guard unavailable, continuing with fallback policy",
        );
      }
    }

    const decision = classifyChatRequest(request.body);
    if (decision.decision !== "allow") {
      runtimeLogger.warn(
        {
          agentId: request.params.agentId,
          classification: decision.decision,
          messageLength: decision.messageLength,
        },
        "chat request blocked by pre-model guard",
      );

      response
        .status(200)
        .set({
          "cache-control": "no-cache",
          connection: "keep-alive",
          "content-type": "text/event-stream; charset=utf-8",
          "x-vercel-ai-ui-message-stream": "v1",
        })
        .send(createChatFallbackStream(decision));
      return;
    }

    const startedAt = Date.now();
    const enrichment = await enrichChatRequestWithProductKnowledge(
      request.body,
      dependencies.searchProductKnowledge ?? searchProductKnowledge,
    );
    request.body = enrichment.body;

    const logContext = {
      agentId: request.params.agentId,
      role: enrichment.role,
      resultCount: enrichment.resultCount,
      durationMs: Date.now() - startedAt,
    };

    if (enrichment.retrievalFailed) {
      runtimeLogger.warn(logContext, "product knowledge retrieval failed");
    } else {
      runtimeLogger.info(logContext, "product knowledge retrieval completed");
    }

    next();
  });

  app.get("/health", (_request, response) => {
    response.json(getRuntimeBootstrapOutput());
  });

  app.get("/ready", (_request, response) => {
    response.json(getRuntimeBootstrapOutput());
  });

  const server = new MastraServer({ app, mastra });
  await server.init();

  runtimeLogger.info(
    {
      routes: ["/health", "/ready", "/jobs", "/jobs/:jobId", "/chat/:agentId"],
    },
    "runtime http routes ready",
  );

  app.use((request, response) => {
    response.status(404).json({
      status: "not-found",
      path: request.url ?? "/",
    });
  });

  const httpServer = createServer(app);
  httpServer.on("close", () => {
    if (env.workerEnabled) {
      void worker.close();
    }
  });
  return httpServer;
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
  const server = await createRuntimeHttpServer();

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
