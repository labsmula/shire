import type { ProfileRole } from "../server/profile-repository";
import type { CandidateProfile, RecruiterProfile } from "../types";

import type {
  ChatResourceType,
  ChatScopeRequest,
  TrustedChatScope,
} from "./types";

export class ChatScopeAuthorizationError extends Error {
  constructor(public readonly code: "role-not-active" | "resource-forbidden") {
    super(code);
    this.name = "ChatScopeAuthorizationError";
  }
}

export type AuthenticatedChatContext = {
  context: Array<{ role: "system"; content: string }>;
  memory: {
    resource: string;
    thread: string;
  };
  scope: TrustedChatScope;
  system: string;
};

type BuildAuthenticatedChatContextInput = {
  profile: CandidateProfile | RecruiterProfile | null;
  requestedScope: ChatScopeRequest & Record<string, unknown>;
  role: ProfileRole;
  userId: string;
};

function assertActiveProfile(
  profile: CandidateProfile | RecruiterProfile | null,
): asserts profile is CandidateProfile | RecruiterProfile {
  if (!profile) {
    throw new ChatScopeAuthorizationError("role-not-active");
  }
}

function trustedProfileContext(
  role: ProfileRole,
  profile: CandidateProfile | RecruiterProfile,
) {
  if (role === "candidate") {
    const candidate = profile as CandidateProfile;
    return [
      `Candidate profile: ${candidate.displayName}`,
      `Bio: ${candidate.bio}`,
      `Experience: ${candidate.experienceLevel}`,
      `Target roles: ${candidate.roleTargets.join(", ") || "Not provided"}`,
      `Skills: ${candidate.skills.join(", ") || "Not provided"}`,
      `Location: ${candidate.location ?? "Not provided"}`,
      `Timezone: ${candidate.timezone ?? "Not provided"}`,
      `Languages: ${candidate.languages.join(", ") || "Not provided"}`,
      `Visibility: ${candidate.visibility}`,
    ];
  }

  const recruiter = profile as RecruiterProfile;
  return [
    `Recruiter profile: ${recruiter.companyName}`,
    `Company description: ${recruiter.companyDescription}`,
    `Website: ${recruiter.companyWebsite ?? "Not provided"}`,
    `Location: ${recruiter.location ?? "Not provided"}`,
    `Verification status: ${recruiter.verificationStatus}`,
    `Trust level: ${recruiter.trustLevel}`,
    `Completed hires: ${recruiter.completedHires}`,
    `Dispute count: ${recruiter.disputeCount}`,
  ];
}

function visibleDemoJob(resourceId: string) {
  return {
    job_fe_aperture: "Senior Frontend Engineer",
    job_sol_mesh: "Solidity Engineer",
    job_design_northwind: "Product Designer",
    job_data_brightside: "Data Analyst",
  }[resourceId];
}

function resolveAuthorizedResource(input: {
  profile: CandidateProfile | RecruiterProfile;
  requestedScope: ChatScopeRequest;
  role: ProfileRole;
  userId: string;
}): {
  resourceId?: string;
  resourceLabel?: string;
  resourceType?: ChatResourceType;
} {
  const { profile, requestedScope, role, userId } = input;

  if (!requestedScope.resourceType) {
    return {};
  }

  if (role === "candidate") {
    if (requestedScope.resourceType === "candidate") {
      return {
        resourceType: "candidate",
        resourceId: userId,
        resourceLabel: (profile as CandidateProfile).displayName,
      };
    }

    if (requestedScope.resourceType === "job" && requestedScope.resourceId) {
      const jobTitle = visibleDemoJob(requestedScope.resourceId);
      if (jobTitle) {
        return {
          resourceType: "job",
          resourceId: requestedScope.resourceId,
          resourceLabel: jobTitle,
        };
      }
    }
  }

  if (role === "recruiter" && requestedScope.resourceType === "company") {
    return {
      resourceType: "company",
      resourceId: userId,
      resourceLabel: (profile as RecruiterProfile).companyName,
    };
  }

  throw new ChatScopeAuthorizationError("resource-forbidden");
}

function buildSystemMessage(input: {
  memoryResource: string;
  profile: CandidateProfile | RecruiterProfile;
  role: ProfileRole;
  scope: TrustedChatScope;
}) {
  const { memoryResource, profile, role, scope } = input;
  const parts = [
    `Viewer: ${scope.viewerId}`,
    `Role: ${scope.role}`,
    `Thread: ${scope.threadId}`,
    `Memory resource: ${memoryResource}`,
    `Scope: ${scope.scope}`,
  ];

  if (scope.resourceType && scope.resourceId) {
    parts.push(`Resource: ${scope.resourceType}:${scope.resourceId}`);
  }

  parts.push(...trustedProfileContext(role, profile));
  return parts.join("\n");
}

export function buildAuthenticatedChatContext({
  profile,
  requestedScope,
  role,
  userId,
}: BuildAuthenticatedChatContextInput): AuthenticatedChatContext {
  assertActiveProfile(profile);

  if (requestedScope.role !== role) {
    throw new ChatScopeAuthorizationError("resource-forbidden");
  }

  const resource = resolveAuthorizedResource({
    profile,
    requestedScope,
    role,
    userId,
  });
  const memoryResource = `user:${userId}:role:${role}`;
  const hasResource = Boolean(resource.resourceType && resource.resourceId);
  const threadId = hasResource
    ? `${memoryResource}:${resource.resourceType}:${resource.resourceId}`
    : `${memoryResource}:general`;
  const scope: TrustedChatScope = {
    viewerId: userId,
    role,
    ...resource,
    threadId,
    resourceKey: memoryResource,
    scope: hasResource ? "resource" : "general",
  };
  const system = buildSystemMessage({
    memoryResource,
    profile,
    role,
    scope,
  });

  return {
    scope,
    memory: {
      resource: memoryResource,
      thread: threadId,
    },
    system,
    context: [{ role: "system", content: system }],
  };
}
