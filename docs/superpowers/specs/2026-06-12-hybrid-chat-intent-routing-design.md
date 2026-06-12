# Hybrid Chat Intent Routing Design

## Problem

The current pre-model chat guard allows requests only when their latest message
matches a narrow English keyword list. Valid platform-help questions such as
"bagaimana cara menggunakan aplikasi ini?" contain no recognized keyword and
are incorrectly blocked with the out-of-scope fallback.

The guard should protect the agent from policy violations without trying to
fully answer semantic scope questions using keywords alone.

## Goals

- Block prompt injection and attempts to access protected instructions or data.
- Allow clear Shire intents in English and Indonesian.
- Allow ambiguous but harmless questions to reach the role-aware agent.
- Block only requests with a clear unrelated intent.
- Keep classification deterministic, local, and free of additional API calls.
- Preserve the existing AI SDK v6 fallback stream contract.

## Non-Goals

- Building a general-purpose natural-language classifier.
- Calling a second LLM before every chat request.
- Expanding the role-aware agent beyond Shire recruitment and platform usage.
- Changing authentication, authorization, or role-based data access.

## Decision

Use a three-stage hybrid guard:

1. **Policy stage:** inspect instruction-bearing request fields and immediately
   block known prompt injection or policy-bypass patterns.
2. **Intent stage:** extract the latest user message and recognize explicit
   Shire, recruitment, platform-help, navigation, account, candidate, and
   recruiter intents in English and Indonesian.
3. **Scope stage:** block only explicit unrelated intents from a small,
   high-confidence deny list. Pass ambiguous harmless messages to the agent,
   where role-aware instructions and product knowledge constrain the answer.

This favors false-negative scope classification over false-positive blocking:
an ambiguous request may reach the scoped agent, but a valid user-help request
will not be rejected merely because it uses unfamiliar wording.

## Classification Contract

`classifyChatRequest` keeps the existing public decisions:

- `prompt-injection`: a policy override, protected-context extraction, or
  guardrail bypass pattern was found.
- `out-of-scope`: the message is missing or has a clearly unrelated intent.
- `allow`: the request is an explicit Shire intent, a social pleasantry, or an
  ambiguous harmless request.

No new HTTP response shape is introduced.

## Intent Categories

Explicit allowed intent patterns cover:

- Shire platform usage and navigation.
- Account, profile, login, registration, and onboarding help.
- Jobs, applications, candidates, recruiters, matching, interviews, and hiring.
- Indonesian equivalents such as `cara menggunakan`, `aplikasi ini`, `daftar`,
  `masuk`, `lowongan`, `lamaran`, `pelamar`, `kandidat`, and `perekrut`.

Explicit unrelated patterns remain intentionally narrow and cover requests such
as recipes, unrelated entertainment trivia, sports results, weather, and
general-purpose coding homework when no Shire context is present.

Messages that match neither list are allowed and delegated to the agent.

## Data Flow

1. Extract the latest user text.
2. Return `out-of-scope` for empty or malformed input.
3. Scan system, context, and conversation messages for injection patterns.
4. Return `prompt-injection` when a policy pattern matches.
5. Return `allow` for explicit Shire intent or social conversation.
6. Return `out-of-scope` for a high-confidence unrelated intent.
7. Otherwise return `allow`.
8. The role-aware agent answers using scoped instructions and retrieved product
   knowledge, or explains which Shire details it needs.

## Error Handling

- Malformed requests continue to receive the deterministic out-of-scope stream.
- Guard classification performs no network request and cannot fail due to an
  upstream provider.
- Provider failures remain handled by the configured OpenRouter model fallback
  chain and are outside this guard's responsibility.

## Testing

Add regression tests that prove:

- Indonesian platform-help questions are allowed.
- English platform-help questions are allowed.
- Ambiguous harmless questions are delegated to the agent.
- Explicit unrelated requests are still blocked.
- Prompt injection remains blocked even when it contains an allowed intent.
- The server route does not emit the fallback for valid platform-help input.

Run the targeted chat guard and server tests first, followed by the complete
agent test suite, TypeScript build, and `git diff --check`.

## Commit Structure

Changes will be grouped on `feat/agent-hybrid-intent-routing`:

1. `docs(agent): design hybrid chat intent routing`
2. Existing provider, embedding, memory, and knowledge changes grouped by their
   module boundaries.
3. `fix(agent): route ambiguous chat through scoped intent guard`

The branch will be pushed only after all verification steps pass.
