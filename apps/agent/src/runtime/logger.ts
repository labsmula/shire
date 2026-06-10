import pino from "pino";
import pinoPretty from "pino-pretty";

import { env } from "../env";

function createRootLogger() {
  const commonOptions = {
    level: env.logLevel,
    base: {
      service: "shire-agent",
      nodeEnv: env.nodeEnv,
    },
  };

  if (!env.prettyLogs) {
    return pino(commonOptions);
  }

  const prettyStream = pinoPretty({
    colorize: true,
    destination: process.stdout,
    ignore: "pid,hostname",
    singleLine: false,
    sync: true,
    translateTime: "SYS:standard",
  });

  return pino(commonOptions, prettyStream);
}

export const logger = createRootLogger();
