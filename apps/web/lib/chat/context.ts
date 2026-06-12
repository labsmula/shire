import type { ChatMessage, ChatProxyRequest, ChatRole, ChatScope } from "./types";
import { buildChatScope, buildChatScopeLabel } from "./thread";

export function buildServerChatScope(input: {
  resourceId?: string;
  resourceLabel?: string;
  resourceType?: ChatScope["resourceType"];
  role: ChatScope["role"];
  viewerId: string;
}) {
  return buildChatScope(input);
}

export function resolveChatScopeForPathname(input: {
  candidateProfileLabel?: string;
  jobs?: { id: string; title: string }[];
  pathname: string;
  recruiterProfileLabel?: string;
  role: ChatRole;
}) {
  const viewerId = input.role === "candidate" ? "candidate-001" : "recruiter-001";

  if (input.role === "candidate") {
    if (input.pathname === "/candidate/profile") {
      return buildServerChatScope({
        viewerId,
        role: input.role,
        resourceType: "candidate",
        resourceId: "candidate-001",
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

      if (jobId === "job_fe_aperture") {
        return buildServerChatScope({
          viewerId,
          role: input.role,
          resourceType: "job",
          resourceId: "job-001",
          resourceLabel: jobLabel,
        });
      }

      if (jobId === "job_sol_mesh") {
        return buildServerChatScope({
          viewerId,
          role: input.role,
          resourceType: "job",
          resourceId: "job-002",
          resourceLabel: jobLabel,
        });
      }
    }
  }

  if (input.role === "recruiter") {
    if (input.pathname === "/recruiter/profile") {
      return buildServerChatScope({
        viewerId,
        role: input.role,
        resourceType: "company",
        resourceId: "company-001",
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

      if (jobId === "job_fe_aperture") {
        return buildServerChatScope({
          viewerId,
          role: input.role,
          resourceType: "job",
          resourceId: "job-001",
          resourceLabel: jobLabel,
        });
      }

      if (jobId === "job_sol_mesh") {
        return buildServerChatScope({
          viewerId,
          role: input.role,
          resourceType: "job",
          resourceId: "job-002",
          resourceLabel: jobLabel,
        });
      }
    }
  }

  return buildServerChatScope({ viewerId, role: input.role });
}

function buildChatSystemMessage(scope: ChatScope) {
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
  scope: ChatScope,
  messages: unknown[],
) {
  const system = buildChatSystemMessage(scope);

  return {
    messages,
    memory: {
      thread: scope.threadId,
      resource: scope.resourceKey,
    },
    system,
    context: [{ role: "system" as const, content: system }],
  };
}

export function buildChatContextLabel(scope: ChatScope) {
  return buildChatScopeLabel({
    role: scope.role,
    resourceType: scope.resourceType,
    resourceLabel: scope.resourceLabel,
  });
}

export function toChatProxyRequest(
  scope: ChatScope,
  messages: ChatMessage[],
): ChatProxyRequest {
  return { scope, messages };
}
