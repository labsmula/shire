import type { ChatResourceType, ChatRole, ChatScope } from "./types";

function roleLabel(role: ChatRole) {
  return role === "candidate" ? "Candidate" : "Recruiter";
}

function resourceTypeLabel(resourceType: ChatResourceType) {
  return resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
}

export function buildChatScopeLabel(input: {
  resourceLabel?: string;
  resourceType?: ChatResourceType;
  role: ChatRole;
}) {
  if (!input.resourceType) {
    return `${roleLabel(input.role)} / General`;
  }

  const typeLabel = resourceTypeLabel(input.resourceType);
  return input.resourceLabel
    ? `${roleLabel(input.role)} / ${typeLabel} / ${input.resourceLabel}`
    : `${roleLabel(input.role)} / ${typeLabel}`;
}

export function buildChatScope(input: {
  resourceId?: string;
  resourceLabel?: string;
  resourceType?: ChatResourceType;
  role: ChatRole;
  viewerId: string;
}): ChatScope {
  const hasResource = Boolean(input.resourceType && input.resourceId);
  const resourceKey = hasResource
    ? `${input.role}:${input.viewerId}:${input.resourceType}:${input.resourceId}`
    : `${input.role}:${input.viewerId}:general`;

  return {
    viewerId: input.viewerId,
    role: input.role,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    resourceLabel: input.resourceLabel,
    threadId: hasResource
      ? resourceKey
      : `${input.role}:${input.viewerId}`,
    resourceKey,
    scope: hasResource ? "resource" : "general",
  };
}
