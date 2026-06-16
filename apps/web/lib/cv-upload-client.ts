import type { AgentCandidateProfile } from "./cv-profile-draft";

type Fetcher = typeof fetch;

export type CvJobState =
  | { status: "queued" | "active"; attempts?: number; maxAttempts?: number }
  | {
      status: "delayed";
      attempts?: number;
      maxAttempts?: number;
      nextRetryAt?: string;
    }
  | { status: "completed"; profile: AgentCandidateProfile }
  | { status: "failed"; message: string };

function authHeaders(accessToken?: string) {
  return accessToken
    ? { authorization: `Bearer ${accessToken}` }
    : undefined;
}

export async function submitCandidateCv(
  file: File,
  accessToken?: string,
  fetcher: Fetcher = fetch,
) {
  const body = new FormData();
  body.set("file", file, file.name);
  const response = await fetcher("/api/candidates/me/cv", {
    method: "POST",
    headers: authHeaders(accessToken),
    body,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message ?? payload.error ?? "CV upload failed.");
  }
  return payload as { jobId: string; status: "queued" };
}

export function normalizeCvJob(input: any): CvJobState {
  if (input.status === "completed") {
    return {
      status: "completed",
      profile: input.result?.profile ?? {},
    };
  }
  if (input.status === "failed") {
    return {
      status: "failed",
      message: input.error?.message ?? "CV processing failed.",
    };
  }
  if (input.status === "delayed") {
    return {
      status: "delayed",
      attempts: input.attempts,
      maxAttempts: input.maxAttempts,
      nextRetryAt: input.nextRetryAt,
    };
  }
  return {
    status: input.status === "active" ? "active" : "queued",
    attempts: input.attempts,
    maxAttempts: input.maxAttempts,
  };
}

export async function getCandidateCvJob(
  jobId: string,
  accessToken?: string,
  fetcher: Fetcher = fetch,
) {
  const response = await fetcher(
    `/api/candidates/me/cv/jobs/${encodeURIComponent(jobId)}`,
    { headers: authHeaders(accessToken) },
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message ?? payload.error ?? "Job status unavailable.");
  }
  return normalizeCvJob(payload);
}
