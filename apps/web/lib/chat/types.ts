export type ChatRole = "candidate" | "recruiter";

export type ChatResourceType = "job" | "candidate" | "company" | "application";

export type ChatScope = {
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
  messages: ChatMessage[];
  scope: ChatScope;
};
