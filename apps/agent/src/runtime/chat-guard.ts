type UnknownRecord = Record<string, unknown>;

export type ChatGuardDecision =
  | { decision: "allow"; messageLength: number }
  | {
      decision: "prompt-injection" | "out-of-scope";
      messageLength: number;
    };

export type BlockedChatGuardDecision = Exclude<
  ChatGuardDecision,
  { decision: "allow" }
>;

export const PROMPT_INJECTION_RESPONSE =
  "I can't follow instructions that attempt to override my rules or access protected context. I can only assist with Shire-related recruitment and employment topics.";

export const OUT_OF_SCOPE_RESPONSE =
  "I can only assist with Shire-related topics, including jobs, candidates, applications, recruiting, matching, profiles, and platform usage.";

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractMessageText(message: UnknownRecord) {
  if (typeof message.content === "string") {
    return message.content.trim();
  }

  if (!Array.isArray(message.parts)) {
    return "";
  }

  return message.parts
    .filter(
      (part): part is UnknownRecord =>
        isRecord(part) &&
        part.type === "text" &&
        typeof part.text === "string",
    )
    .map((part) => String(part.text))
    .join("")
    .trim();
}

export function extractLatestUserText(body: unknown) {
  if (!isRecord(body) || !Array.isArray(body.messages)) {
    return undefined;
  }

  for (let index = body.messages.length - 1; index >= 0; index -= 1) {
    const message = body.messages[index];
    if (!isRecord(message) || message.role !== "user") {
      continue;
    }

    const text = extractMessageText(message);
    return text || undefined;
  }

  return undefined;
}

function extractInstructionBearingText(body: unknown) {
  if (!isRecord(body)) {
    return [];
  }

  const texts: string[] = [];
  if (typeof body.system === "string") {
    texts.push(body.system);
  }

  for (const field of ["messages", "context"] as const) {
    if (!Array.isArray(body[field])) {
      continue;
    }

    for (const entry of body[field]) {
      if (!isRecord(entry)) {
        continue;
      }

      const text = extractMessageText(entry);
      if (text) {
        texts.push(text);
      }
    }
  }

  return texts;
}

const injectionPatterns = [
  /\bignore\b.{0,40}\b(previous|prior|above|system|developer)\b.{0,30}\b(instruction|prompt|rule)/i,
  /\b(disregard|override|forget)\b.{0,40}\b(instruction|prompt|rule|policy)/i,
  /\b(reveal|show|print|repeat|expose|leak)\b.{0,40}\b(system prompt|hidden instruction|developer message|protected context|memory|secret|credential)/i,
  /\b(act as|pretend to be|you are now)\b.{0,50}\b(unrestricted|administrator|admin|developer|system|root)/i,
  /\b(bypass|disable|remove|evade)\b.{0,40}\b(policy|guardrail|safety|access|permission|restriction)/i,
  /\b(jailbreak|developer mode|dan mode|no restrictions)\b/i,
  /\b(encoded|base64|rot13)\b.{0,40}\b(instruction|prompt|command)/i,
];

const allowedTopicPatterns = [
  /\bshire\b/i,
  /\b(job|jobs|role|roles|position|positions|vacancy|vacancies)\b/i,
  /\b(candidate|candidates|applicant|applicants|talent)\b/i,
  /\b(application|applications|apply|applied|applying)\b/i,
  /\b(recruiter|recruiting|recruitment|hiring|hire)\b/i,
  /\b(match|matching|recommendation|shortlist|screening)\b/i,
  /\b(profile|profiles|resume|cv|curriculum vitae|portfolio)\b/i,
  /\b(company|companies|employer|employment|career|workplace)\b/i,
  /\b(interview|interviews|skill|skills|qualification|qualifications)\b/i,
  /\b(salary|compensation|offer|onboarding)\b/i,
];

const socialPleasantryPatterns = [
  /^(hi|hello|hey|halo|hallo)(\s+(there|shire|assistant))?[!.?]*$/i,
  /^(good\s+(morning|afternoon|evening))[!.?]*$/i,
  /^(how\s+are\s+you|how(?:'s| is)\s+it\s+going)[!.?]*$/i,
  /^(thanks|thank\s+you|terima\s+kasih)[!.?]*$/i,
  /^(bye|goodbye|see\s+you)[!.?]*$/i,
];

export function classifyChatRequest(body: unknown): ChatGuardDecision {
  const text = extractLatestUserText(body);
  const messageLength = text?.length ?? 0;

  if (!text) {
    return { decision: "out-of-scope", messageLength };
  }

  const instructionText = extractInstructionBearingText(body);
  if (
    instructionText.some((value) =>
      injectionPatterns.some((pattern) => pattern.test(value)),
    )
  ) {
    return { decision: "prompt-injection", messageLength };
  }

  if (
    socialPleasantryPatterns.some((pattern) => pattern.test(text)) ||
    allowedTopicPatterns.some((pattern) => pattern.test(text))
  ) {
    return { decision: "allow", messageLength };
  }

  return { decision: "out-of-scope", messageLength };
}

export function createChatFallbackStream(decision: BlockedChatGuardDecision) {
  const messageId = `guard-${crypto.randomUUID()}`;
  const textId = `text-${crypto.randomUUID()}`;
  const text =
    decision.decision === "prompt-injection"
      ? PROMPT_INJECTION_RESPONSE
      : OUT_OF_SCOPE_RESPONSE;
  const events = [
    { type: "start", messageId },
    { type: "start-step" },
    { type: "text-start", id: textId },
    { type: "text-delta", id: textId, delta: text },
    { type: "text-end", id: textId },
    { type: "finish-step" },
    { type: "finish" },
  ];

  return `${events
    .map((event) => `data: ${JSON.stringify(event)}\n\n`)
    .join("")}data: [DONE]\n\n`;
}
