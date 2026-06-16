import { ZodError } from "zod";

const transientCodes = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "ENETUNREACH",
  "ETIMEDOUT",
]);

function readNumber(error: object, key: "status" | "statusCode") {
  const value = (error as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}

export function isRetryableJobError(error: unknown): boolean {
  if (error instanceof ZodError) {
    return false;
  }
  if (!error || typeof error !== "object") {
    return false;
  }

  const status =
    readNumber(error, "statusCode") ?? readNumber(error, "status");
  if (status === 429 || (status !== undefined && status >= 500 && status < 600)) {
    return true;
  }

  const code = (error as Record<string, unknown>).code;
  if (typeof code === "string" && transientCodes.has(code)) {
    return true;
  }

  if (
    error instanceof Error &&
    /(timeout|timed out|temporarily unavailable|socket hang up)/i.test(
      error.message,
    )
  ) {
    return true;
  }

  return isRetryableJobError((error as { cause?: unknown }).cause);
}
