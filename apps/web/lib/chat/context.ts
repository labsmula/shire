import type {
  ChatProxyRequest,
  ChatRole,
  ChatScopeRequest,
  TrustedChatScope,
} from "./types";
import { buildChatScopeLabel, buildChatScopeRequest } from "./thread";

export function buildServerChatScopeRequest(input: {
  resourceId?: string;
  resourceLabel?: string;
  resourceType?: ChatScopeRequest["resourceType"];
  role: ChatScopeRequest["role"];
}) {
  return buildChatScopeRequest(input);
}

export function resolveChatScopeForPathname(input: {
  candidateProfileLabel?: string;
  jobs?: { id: string; title: string }[];
  pathname: string;
  recruiterProfileLabel?: string;
  role: ChatRole;
}) {
  if (input.role === "candidate") {
    if (input.pathname === "/candidate/profile") {
      return buildServerChatScopeRequest({
        role: input.role,
        resourceType: "candidate",
        resourceLabel: input.candidateProfileLabel ?? "You",
      });
    }

    const jobMatch = input.pathname.match(/^\/candidate\/jobs\/([^/]+)$/);
    if (jobMatch) {
      const jobId = jobMatch[1];
      const jobLabel =
        input.jobs?.find((job) => job.id === jobId)?.title ??
        (jobId === "job_fe_aperture"
          ? "Senior Frontend Engineer"
          : jobId === "job_sol_mesh"
            ? "Solidity Engineer"
            : undefined);

      if (jobId === "job_fe_aperture" || jobId === "job_sol_mesh") {
        return buildServerChatScopeRequest({
          role: input.role,
          resourceType: "job",
          resourceId: jobId,
          resourceLabel: jobLabel,
        });
      }
    }
  }

  if (input.role === "recruiter") {
    if (input.pathname === "/recruiter/profile") {
      return buildServerChatScopeRequest({
        role: input.role,
        resourceType: "company",
        resourceLabel: input.recruiterProfileLabel ?? "Aperture Labs",
      });
    }

    const jobMatch = input.pathname.match(/^\/recruiter\/jobs\/([^/]+)$/);
    if (jobMatch) {
      const jobId = jobMatch[1];
      const jobLabel =
        input.jobs?.find((job) => job.id === jobId)?.title ??
        (jobId === "job_fe_aperture"
          ? "Senior Frontend Engineer"
          : jobId === "job_sol_mesh"
            ? "Solidity Engineer"
            : undefined);

      if (jobId === "job_fe_aperture" || jobId === "job_sol_mesh") {
        return buildServerChatScopeRequest({
          role: input.role,
          resourceType: "job",
          resourceId: jobId,
          resourceLabel: jobLabel,
        });
      }
    }
  }

  return buildServerChatScopeRequest({ role: input.role });
}

function buildChatSystemMessage(scope: TrustedChatScope) {
  const scopeParts = [
    `Viewer: ${scope.viewerId}`,
    `Role: ${scope.role}`,
    `Thread: ${scope.threadId}`,
    `Scope: ${scope.scope}`,
  ];

  if (scope.resourceType && scope.resourceId) {
    scopeParts.push(`Resource: ${scope.resourceType}:${scope.resourceId}`);
  }

  return scopeParts.join("\n");
}

export function buildChatProxyBody(
  scope: TrustedChatScope,
  messages: unknown[],
) {
  const system = buildChatSystemMessage(scope);

  return {
    scope,
    messages,
    memory: {
      thread: scope.threadId,
      resource: scope.resourceKey,
    },
    system,
    context: [{ role: "system" as const, content: system }],
  };
}

export function buildChatContextLabel(scope: ChatScopeRequest) {
  return buildChatScopeLabel({
    role: scope.role,
    resourceType: scope.resourceType,
    resourceLabel: scope.resourceLabel,
  });
}

export function toChatProxyRequest(
  scope: ChatScopeRequest,
  messages: unknown[],
): ChatProxyRequest {
  return { scope, messages };
}
