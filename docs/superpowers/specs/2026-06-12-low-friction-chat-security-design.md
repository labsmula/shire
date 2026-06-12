# Low-Friction Chat Security Design

## Problem

The current chat guard can become too restrictive when it treats recognized
intent mappings as an allow list. Real users may phrase valid questions in any
language or use wording that was not anticipated by the application. Unknown
wording must not automatically produce a fallback response.

The system still needs to resist prompt injection, protected-context extraction,
authorization bypass, abuse, and accidental output leakage without adding an
expensive model call to every request.

## Goals

- Allow every valid, non-malicious prompt by default.
- Never use intent classification as an authorization boundary.
- Block only malformed input, rate-limit violations, and high-confidence
  security violations.
- Detect multilingual prompt injection without requiring a model call for every
  request.
- Keep the first production configuration low-budget and free-first.
- Preserve deterministic server-side authorization and least-privilege access.
- Validate output for secret leakage and unsafe response characteristics.
- Record security decisions and evaluation metrics without logging raw prompts.

## Non-Goals

- Blocking every question that is unrelated to Shire before it reaches the
  agent.
- Maintaining an exhaustive list of supported languages or user intents.
- Allowing an LLM classifier to grant data access or privileged actions.
- Adding privileged tools to the free-model role-aware chat agent.
- Guaranteeing perfect prompt-injection detection.

## Core Decision

The request pipeline is **default allow**.

Intent mappings are advisory metadata used for routing, retrieval, and
observability. A missing or unknown intent never causes a request to be blocked.
The scoped agent handles unrelated questions naturally by explaining its Shire
scope.

Only these conditions produce a deterministic fallback:

- The request body is empty, malformed, or exceeds configured limits.
- The caller exceeds the applicable rate limit.
- Deterministic checks identify a high-confidence injection, secret-extraction,
  or authorization-bypass attempt.
- A suspicious request is confirmed unsafe by the multilingual model guard.
- A high-risk guard request cannot be evaluated and the risk policy requires
  fail-closed behavior.

## Request Pipeline

```text
HTTP request
  -> deterministic request validation
  -> hybrid rate limiter
  -> deterministic security indicators
  -> multilingual model guard only when suspicious
  -> deterministic risk policy
  -> optional intent metadata extraction
  -> server authorization and scoped retrieval
  -> least-privilege role-aware agent
  -> deterministic output validation
  -> security telemetry and evaluation sampling
```

## Components

### Request Validation

Validate before invoking any model:

- JSON object body.
- Supported message structure.
- At least one non-empty user message.
- Configurable maximum body bytes.
- Configurable maximum message count.
- Configurable maximum latest-message characters.
- Valid role and scope shape when supplied.

Invalid requests return a deterministic stream without retrieval or model calls.

### Hybrid Rate Limiter

Define a small adapter interface with:

- An in-memory token-bucket implementation as the default.
- An optional distributed adapter selected by configuration for production
  multi-instance deployments.
- Keys based on authenticated viewer ID when available, otherwise a normalized
  client IP.
- Separate limits for ordinary requests and blocked security attempts.
- Standard `Retry-After` metadata on rate-limit responses.

The initial implementation does not require Redis. The interface must allow a
Redis or Upstash adapter to be added without changing HTTP middleware.

### Deterministic Security Indicators

Retain fast multilingual checks for high-confidence patterns:

- Instruction override and system-prompt extraction.
- Secret, credential, memory, and protected-context extraction.
- Authorization, role, permission, and safeguard bypass.
- Common encoding and obfuscation instructions.
- Suspicious instructions found in request system/context/history fields.

The indicator result is not a broad topic classifier. It returns:

- `safe`: no known security signal.
- `suspicious`: requires model guard evaluation.
- `blocked`: sufficiently explicit violation that can be rejected immediately.

Unknown language or unknown wording returns `safe`, not `blocked`.

### Multilingual Model Guard

Call a low-cost structured-output classifier only for suspicious input. The
schema contains:

- `classification`: `safe`, `prompt-injection`, `secret-extraction`, or
  `authorization-bypass`.
- `confidence`: number from zero to one.
- `reasonCode`: bounded enum.
- `detectedLanguage`: short string.

Use an explicit configurable OpenRouter model chain rather than
`openrouter/free`. The initial policy is free-first with a low-cost fallback.
The classifier receives only the minimum text needed for security evaluation
and cannot access memory, retrieval, tools, or user data.

### Risk Policy

Apply deterministic decisions to guard output:

- Explicit deterministic `blocked`: fail closed.
- Guard classification unsafe above the configured confidence threshold: block.
- Guard failure for suspicious secret or authorization bypass: fail closed.
- Guard failure for low-risk read-only platform help: allow with a telemetry
  flag.
- No security indicator: allow without a model guard call.

The model guard cannot convert an unauthorized request into an authorized one.

### Intent Metadata

Intent extraction is optional and never blocks. It may classify requests into
bounded categories such as platform help, job search, application help,
candidate matching, recruiter workflow, social conversation, or unknown.

For low-budget operation, deterministic mappings run first. Unknown intents are
left as `unknown` and passed to the scoped agent. A separate LLM intent call is
not required in the initial implementation.

### Scoped Agent and Least Privilege

The server validates viewer role, resource ownership, relationship, and allowed
action before retrieving protected context. Product knowledge remains untrusted
reference data and cannot expand permissions.

The role-aware chat agent remains without privileged tools while free models are
used. Any future tool must validate authorization inside its execute boundary;
model intent or instructions never grant permission.

### Output Validation

Validate generated output before completing the stream where technically
possible:

- Enforce configurable output character limits.
- Detect likely system-prompt, credential, token, or internal-configuration
  leakage.
- Detect responses claiming unauthorized access or completed privileged actions.
- Replace blocked output with a deterministic safe response and log a reason
  code.

Streaming validation may buffer bounded text before release. A model-based
output moderation call is reserved for high-risk responses and is not required
for every response in the low-budget configuration.

### Logging and Evaluation

Log structured metadata without raw message contents:

- Request ID and hashed caller key.
- Validation outcome and rate-limit decision.
- Security indicator and guard classification.
- Guard model, latency, fallback use, and confidence.
- Intent metadata.
- Authorization scope.
- Retrieval result count.
- Output validation result.
- Total request duration.

Maintain a versioned evaluation fixture containing multilingual benign prompts,
prompt injections, secret-extraction attempts, obfuscated attacks, unrelated
questions, and ambiguous platform requests. Tests measure false blocks and
missed high-confidence attacks. Raw production prompts are not automatically
added to fixtures.

## Configuration

Add bounded environment configuration:

```env
SHIRE_CHAT_MAX_BODY_BYTES=65536
SHIRE_CHAT_MAX_MESSAGES=50
SHIRE_CHAT_MAX_MESSAGE_CHARACTERS=8000
SHIRE_CHAT_RATE_LIMIT_REQUESTS=30
SHIRE_CHAT_RATE_LIMIT_WINDOW_SECONDS=60
SHIRE_SECURITY_GUARD_ENABLED=true
SHIRE_SECURITY_GUARD_MODE=suspicious-only
SHIRE_SECURITY_GUARD_MODELS=openrouter/<free-security-model>,openrouter/<low-cost-fallback>
SHIRE_SECURITY_GUARD_THRESHOLD=0.85
SHIRE_OUTPUT_MAX_CHARACTERS=12000
```

Exact model IDs remain deployment configuration because OpenRouter availability
and pricing change independently of application behavior.

## Failure Behavior

- Validation failure: deterministic client-safe fallback.
- Rate limit: deterministic response with retry metadata.
- Safe request: proceed without model guard.
- Suspicious high-risk request and guard unavailable: block.
- Suspicious low-risk read-only request and guard unavailable: proceed, mark
  degraded security evaluation, and keep least-privilege restrictions.
- Retrieval failure: continue without product context.
- Output validation failure: suppress unsafe output and return a safe fallback.

## Testing

Add unit and HTTP integration coverage for:

- Unknown wording and unsupported languages defaulting to allow.
- Known prompt injection in multiple languages being blocked.
- Suspicious requests invoking the model guard.
- Ordinary safe requests skipping the model guard.
- Risk-based fail-open and fail-closed behavior.
- Viewer and IP rate-limit keys.
- Request size and message-count limits.
- Authorization remaining independent from intent classification.
- Output leakage and excessive-length suppression.
- Structured telemetry containing no raw prompt.
- Evaluation fixtures tracking false-block and attack-detection rates.

Run targeted tests first, then the full agent suite, TypeScript build, and
`git diff --check`.

## Delivery Structure

Implement in focused commits:

1. Deterministic request validation and hybrid rate-limit abstraction.
2. Suspicious-only multilingual model guard and risk policy.
3. Advisory intent metadata and scoped authorization integration.
4. Output validation.
5. Security telemetry and evaluation fixtures.

Each commit must preserve the default-allow behavior for valid unknown prompts.
