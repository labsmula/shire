export type ChatRole = "candidate" | "recruiter";

export type ChatResourceType = "job" | "candidate" | "company" | "application";

export type ChatScopeRequest = {
  role: ChatRole;
  resourceType?: ChatResourceType;
  resourceId?: string;
  resourceLabel?: string;
};

export type TrustedChatScope = {
  viewerId: string;
  role: ChatRole;
  resourceType?: ChatResourceType;
  resourceId?: string;
  resourceLabel?: string;
  threadId: string;
  resourceKey: string;
  scope: "general" | "resource";
};

export type ChatMessage = {
  content: string;
  role: "user" | "assistant" | "system";
};

export type ChatProxyRequest = {
  messages: unknown[];
  scope: ChatScopeRequest;
};
