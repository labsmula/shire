# Privy Multi-Role Profile and Chat Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist candidate and recruiter profiles by verified Privy identity in hosted Postgres, activate roles from saved profiles, and isolate Mastra chat memory by user, role, and resource.

**Architecture:** Next.js API routes verify Privy access tokens and query hosted Postgres through server-only Drizzle ORM. The browser sends only a requested role/resource and messages; the chat proxy resolves the user, verifies the role profile, rebuilds trusted scope and memory keys, and forwards the request to the agent with the internal service token. Mastra keeps message history in thread-specific keys and role-specific resource memory.

**Tech Stack:** Next.js App Router, Privy React/Node SDKs, Neon/PostgreSQL, Drizzle ORM, postgres.js, Drizzle Kit, Zod, Assistant UI AI SDK transport, Mastra Memory, Node test runner.

---

## File Structure

New focused modules:

- `apps/web/lib/server/authenticated-user.ts`: Privy token verification and demo-mode identity.
- `apps/web/lib/server/db/index.ts`: lazy server-only Drizzle connection.
- `apps/web/lib/server/db/schema.ts`: typed Postgres schema.
- `apps/web/lib/server/profile-repository.ts`: user and role-profile persistence contract.
- `apps/web/lib/profile-client.ts`: authenticated browser profile API client.
- `apps/web/lib/chat/server-scope.ts`: server-owned role authorization, thread keys, and trusted context.
- `apps/web/app/api/profiles/candidate/route.ts`: candidate profile GET/PUT.
- `apps/web/app/api/profiles/recruiter/route.ts`: recruiter profile GET/PUT.
- `apps/web/drizzle/*_privy_role_profiles.sql`: Drizzle migration, timestamps, and RLS.

Existing files remain responsible for presentation, demo cache, and agent runtime concerns.

---

### Task 1: Bootstrap Drizzle and Profile Schema

**Files:**
- Create: `apps/web/drizzle.config.ts`
- Create: `apps/web/drizzle.migrate.config.ts`
- Create: `apps/web/lib/server/db/schema.ts`
- Create through Drizzle Kit: `apps/web/drizzle/*`
- Modify: `apps/web/package.json`
- Modify: `apps/web/.env.example`
- Modify: `package-lock.json`

- [ ] **Step 1: Install Drizzle and the Postgres driver**

Run:

```powershell
npm.cmd uninstall @supabase/supabase-js --workspace=@shire/web
npm.cmd install drizzle-orm postgres --workspace=@shire/web
npm.cmd install -D drizzle-kit --workspace=@shire/web
```

Expected: the native Supabase JavaScript client is absent and Drizzle packages
are present in the web workspace.

- [ ] **Step 2: Define the typed schema**

Define `appUsers`, `candidateProfiles`, and `recruiterProfiles` in
`apps/web/lib/server/db/schema.ts` with Drizzle's PostgreSQL schema API. Use
UUID primary keys, a unique Privy ID, JSONB profiles, timezone-aware timestamps,
and cascading foreign keys.

- [ ] **Step 3: Configure Drizzle Kit**

`apps/web/drizzle.config.ts` is offline and used only for schema generation:

```ts
export default defineConfig({
  schema: "./lib/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
});
```

`apps/web/drizzle.migrate.config.ts` uses the same schema/output and fails at
config load when `DIRECT_DATABASE_URL` is absent.

Add workspace scripts:

```json
"db:generate": "node --env-file-if-exists=.env ../../node_modules/drizzle-kit/bin.cjs generate --config=drizzle.config.ts",
"db:migrate": "node --env-file-if-exists=.env ../../node_modules/drizzle-kit/bin.cjs migrate --config=drizzle.migrate.config.ts"
```

- [ ] **Step 4: Generate and secure the initial migration**

Run `npm run db:generate --workspace=@shire/web -- --name=privy_role_profiles`.
The resulting Drizzle migration is the only migration source. Extend it with
the safe `updated_at` function/triggers, RLS enablement, and revokes from
`anon` and `authenticated`. Do not create browser policies.

- [ ] **Step 5: Document server-only environment variables**

Add to `apps/web/.env.example`:

```env
# Hosted Postgres. Never prefix database URLs with NEXT_PUBLIC_.
# Pooled URL for runtime queries; postgres.js uses prepare: false.
DATABASE_URL=
# Direct/unpooled URL used only by Drizzle Kit migrations.
DIRECT_DATABASE_URL=
```

- [ ] **Step 6: Validate generated metadata**

Run:

```powershell
npm.cmd run db:generate --workspace=@shire/web
npm.cmd run typecheck --workspace=@shire/web
git diff --check
```

Expected: Drizzle reports no new schema changes, typecheck passes, and the diff
has no whitespace errors.

- [ ] **Step 7: Commit**

```powershell
git add -- apps/web/package.json apps/web/.env.example apps/web/drizzle.config.ts apps/web/drizzle.migrate.config.ts apps/web/lib/server/db/schema.ts apps/web/drizzle package-lock.json
git commit -m "refactor(db): use Drizzle for Supabase Postgres"
```

---

### Task 2: Generalize Privy Authentication and Add Profile Repository

**Files:**
- Create: `apps/web/lib/server/authenticated-user.ts`
- Create: `apps/web/lib/server/db/index.ts`
- Create: `apps/web/lib/server/profile-repository.ts`
- Create: `apps/web/test/profile-repository.test.ts`
- Modify: `apps/web/lib/server/candidate-identity.ts`
- Modify: `apps/web/test/cv-route.test.ts`

- [ ] **Step 1: Write failing authentication and repository tests**

Test these contracts in `profile-repository.test.ts` with injected dependencies:

```ts
test("verified Privy identity is returned instead of browser identity", async () => {
  const identity = await resolveAuthenticatedUser(requestWithBearer("token"), {
    appId: "app-id",
    appSecret: "secret",
    verifyAccessToken: async () => ({ userId: "did:privy:real-user" }),
  });
  assert.deepEqual(identity, {
    mode: "privy",
    privyUserId: "did:privy:real-user",
  });
});

test("configured Privy rejects a missing token", async () => {
  await assert.rejects(
    resolveAuthenticatedUser(new Request("http://localhost"), configuredDeps),
    AuthenticatedUserError,
  );
});

test("one user can own candidate and recruiter profiles", async () => {
  const repository = createInMemoryProfileRepository();
  const user = await repository.resolveUser("did:privy:one");
  await repository.upsertProfile(user.id, "candidate", candidateProfile);
  await repository.upsertProfile(user.id, "recruiter", recruiterProfile);
  assert.ok(await repository.getProfile(user.id, "candidate"));
  assert.ok(await repository.getProfile(user.id, "recruiter"));
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
Set-Location apps/web
node --import tsx --test test/profile-repository.test.ts
```

Expected: FAIL because the new modules do not exist.

- [ ] **Step 3: Implement generic authenticated identity**

`authenticated-user.ts` exports:

```ts
export class AuthenticatedUserError extends Error {}

export type AuthenticatedUser =
  | { mode: "demo"; privyUserId: "demo-user" }
  | { mode: "privy"; privyUserId: string };

export async function resolveAuthenticatedUser(
  request: Request,
  dependencies?: AuthenticatedUserDependencies,
): Promise<AuthenticatedUser>;
```

Rules:

- If both Privy app ID and secret are absent, return demo identity.
- If only one is configured, throw a configuration error.
- If both are configured, require and verify a bearer token.
- Never accept a user ID from request JSON.

Keep `candidate-identity.ts` as a compatibility wrapper that returns
`resolveAuthenticatedUser(request).privyUserId`, then update CV tests to expect
the verified Privy ID or `demo-user`.

- [ ] **Step 4: Implement the lazy Drizzle connection**

`db/index.ts` exports a lazy server-only factory:

```ts
export function createDatabase() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new DatabaseConfigurationError();
  }
  const client = postgres(url, { prepare: false });
  return drizzle(client, { schema });
}
```

Do not connect at module import time because tests and builds may not have
production credentials.

- [ ] **Step 5: Implement repository interface and Supabase adapter**

The repository contract:

```ts
export type ProfileRole = "candidate" | "recruiter";

export interface ProfileRepository {
  resolveUser(privyUserId: string): Promise<{ id: string; privyUserId: string }>;
  getProfile(userId: string, role: ProfileRole): Promise<unknown | null>;
  upsertProfile(
    userId: string,
    role: ProfileRole,
    profile: unknown,
  ): Promise<unknown>;
  listActiveRoles(userId: string): Promise<ProfileRole[]>;
}
```

The Drizzle adapter uses `onConflictDoUpdate` for users and role profiles.
Resolve the user and profile writes transactionally where a route needs both.
Throw typed repository errors instead of returning partial data.

- [ ] **Step 6: Run focused and existing CV tests**

Run:

```powershell
Set-Location apps/web
node --import tsx --test test/profile-repository.test.ts test/cv-route.test.ts
npm.cmd run typecheck --workspace=@shire/web
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- apps/web/lib/server/authenticated-user.ts apps/web/lib/server/db/index.ts apps/web/lib/server/profile-repository.ts apps/web/lib/server/candidate-identity.ts apps/web/test/profile-repository.test.ts apps/web/test/cv-route.test.ts
git commit -m "feat(web): resolve Privy users and role profiles"
```

---

### Task 3: Add Authenticated Candidate and Recruiter Profile APIs

**Files:**
- Create: `apps/web/app/api/profiles/candidate/route.ts`
- Create: `apps/web/app/api/profiles/recruiter/route.ts`
- Create: `apps/web/lib/server/profile-route.ts`
- Create: `apps/web/test/profile-route.test.ts`
- Modify: `apps/web/lib/schemas.ts`
- Modify: `apps/web/app/api/candidates/me/cv/route.ts`
- Modify: `apps/web/app/api/candidates/me/cv/jobs/[jobId]/route.ts`
- Modify: `apps/web/test/cv-route.test.ts`

- [ ] **Step 1: Write failing route tests**

Cover:

```ts
test("candidate PUT persists a validated profile for the verified user");
test("recruiter PUT activates a second role for the same user");
test("GET returns 404 when the requested role has no profile");
test("PUT rejects an invalid profile with 400");
test("missing or invalid Privy tokens return 401");
test("CV upload forwards the internal Shire user UUID as candidateId");
test("CV polling checks ownership with the internal Shire user UUID");
```

Inject `resolveAuthenticatedUser` and an in-memory `ProfileRepository` through
a `createProfileRouteHandlers(role, dependencies)` factory so tests do not call
Privy or Supabase.

- [ ] **Step 2: Run route tests and verify RED**

```powershell
Set-Location apps/web
node --import tsx --test test/profile-route.test.ts
```

Expected: FAIL because handlers do not exist.

- [ ] **Step 3: Add normalized recruiter schema**

Keep editable recruiter input separate from server-owned metrics:

```ts
export const persistedRecruiterProfileSchema = recruiterProfileSchema.transform(
  (values) => ({
    ...values,
    companyWebsite: values.companyWebsite || undefined,
    contactEmail: values.contactEmail || undefined,
    location: values.location || undefined,
    verificationStatus: "UNVERIFIED" as const,
    trustLevel: 30,
    completedHires: 0,
    disputeCount: 0,
  }),
);
```

Candidate persistence uses `candidateProfileSchema` and normalizes empty optional URLs to `undefined`.

- [ ] **Step 4: Implement shared profile route handlers**

The factory:

```ts
export function createProfileRouteHandlers(
  role: ProfileRole,
  dependencies: ProfileRouteDependencies = defaultDependencies,
) {
  return { GET, PUT };
}
```

Each handler:

1. Verifies Privy.
2. Resolves the Shire user.
3. Validates profile output from the repository on GET.
4. Validates request JSON before PUT.
5. Returns stable errors from the approved spec.

The route files only bind:

```ts
const handlers = createProfileRouteHandlers("candidate");
export const GET = handlers.GET;
export const PUT = handlers.PUT;
```

- [ ] **Step 5: Align CV ownership with the internal user**

Update both CV proxy routes to:

1. Verify the Privy identity.
2. Resolve `app_users` through `ProfileRepository`.
3. Use the internal `app_users.id` UUID as `candidateId`.

The browser still cannot provide or override `candidateId`. This keeps CV
drafts, candidate profiles, and chat identity attached to one internal user.

- [ ] **Step 6: Verify**

```powershell
Set-Location apps/web
node --import tsx --test test/profile-route.test.ts test/cv-route.test.ts
npm.cmd run test --workspace=@shire/web
npm.cmd run typecheck --workspace=@shire/web
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- apps/web/app/api/profiles apps/web/app/api/candidates/me/cv apps/web/lib/server/profile-route.ts apps/web/lib/schemas.ts apps/web/test/profile-route.test.ts apps/web/test/cv-route.test.ts
git commit -m "feat(web): persist authenticated role profiles"
```

---

### Task 4: Move Profile Forms to Server Persistence

**Files:**
- Create: `apps/web/lib/profile-client.ts`
- Create: `apps/web/lib/auth/use-access-token.ts`
- Create: `apps/web/test/profile-client.test.ts`
- Modify: `apps/web/components/profile/candidate-profile-form.tsx`
- Modify: `apps/web/components/profile/recruiter-profile-form.tsx`
- Modify: `apps/web/app/candidate/profile/page.tsx`
- Modify: `apps/web/app/recruiter/profile/page.tsx`
- Modify: `apps/web/app/onboarding/candidate/page.tsx`
- Modify: `apps/web/app/onboarding/recruiter/page.tsx`

- [ ] **Step 1: Write failing profile client tests**

Test:

```ts
test("loads a role profile with a Privy bearer token");
test("saves a role profile with a Privy bearer token");
test("maps 404 to ProfileNotFoundError");
test("maps 401 and 403 to stable typed errors");
```

- [ ] **Step 2: Run focused test and verify RED**

```powershell
node --import tsx --test apps/web/test/profile-client.test.ts
```

Expected: FAIL because `profile-client.ts` does not exist.

- [ ] **Step 3: Implement reusable access-token hook**

Extract the safe build-time Privy/demo pattern currently duplicated in CV upload:

```ts
export function useAccessToken(): () => Promise<string | undefined>;
```

Privy mode requires an authenticated session and a non-empty token. Demo mode returns `undefined`. Update `CandidateCvUpload` to use this hook without changing behavior.

- [ ] **Step 4: Implement profile API client**

Export:

```ts
export async function getProfile<T>(
  role: "candidate" | "recruiter",
  accessToken?: string,
  fetcher: typeof fetch = fetch,
): Promise<T>;

export async function saveProfile<T>(
  role: "candidate" | "recruiter",
  profile: T,
  accessToken?: string,
  fetcher: typeof fetch = fetch,
): Promise<T>;
```

Use typed errors for `401`, `403`, and `404`.

- [ ] **Step 5: Make forms asynchronous and server-first**

For both forms:

- Accept `initialProfile`.
- Disable submit while saving.
- Get the current access token.
- PUT the validated profile.
- Update Zustand only after API success.
- Show an error toast without changing local cache on failure.
- Redirect only after success.

Profile/onboarding pages load the role profile on mount. A `404` is valid on onboarding and produces an empty form. Profile pages redirect a missing role to the matching onboarding route.

When `PRIVY_ENABLED` is false, keep the existing Zustand-only save and load
flow. Demo mode must not require Supabase credentials or call protected profile
APIs.

- [ ] **Step 6: Verify client behavior**

```powershell
node --import tsx --test apps/web/test/profile-client.test.ts
npm.cmd run test --workspace=@shire/web
npm.cmd run typecheck --workspace=@shire/web
```

Run ESLint on all changed profile TSX files.

- [ ] **Step 7: Commit**

```powershell
git add -- apps/web/lib/profile-client.ts apps/web/lib/auth/use-access-token.ts apps/web/test/profile-client.test.ts apps/web/components/profile apps/web/app/candidate/profile/page.tsx apps/web/app/recruiter/profile/page.tsx apps/web/app/onboarding
git commit -m "feat(web): save role profiles by Privy user"
```

---

### Task 5: Build Server-Owned Chat Scope and Trusted Context

**Files:**
- Create: `apps/web/lib/chat/server-scope.ts`
- Create: `apps/web/test/chat-server-scope.test.ts`
- Modify: `apps/web/lib/chat/types.ts`
- Modify: `apps/web/lib/chat/context.ts`
- Modify: `apps/web/test/chat-thread.test.ts`

- [ ] **Step 1: Write failing server-scope tests**

Required assertions:

```ts
test("candidate and recruiter resources differ for one user");
test("two users never receive the same resource or thread keys");
test("browser viewerId and memory keys are ignored");
test("candidate trusted context includes the saved display name");
test("an inactive role is rejected");
test("candidate self-profile scope uses the authenticated user UUID");
```

- [ ] **Step 2: Run and verify RED**

```powershell
node --import tsx --test apps/web/test/chat-server-scope.test.ts
```

Expected: FAIL because `server-scope.ts` does not exist.

- [ ] **Step 3: Replace browser-owned `ChatScope` with a request shape**

Client request:

```ts
export type ChatScopeRequest = {
  role: "candidate" | "recruiter";
  resourceType?: ChatResourceType;
  resourceId?: string;
  resourceLabel?: string;
};
```

Trusted server scope keeps `viewerId`, `threadId`, `resourceKey`, and role.

Remove hard-coded viewer IDs from `resolveChatScopeForPathname`. For a candidate
profile page, send resource type `candidate` without a seed candidate ID; the
server replaces it with the authenticated Shire user UUID.

- [ ] **Step 4: Implement trusted scope construction**

`buildAuthenticatedChatContext` receives:

```ts
{
  userId: string;
  role: ProfileRole;
  profile: CandidateProfile | RecruiterProfile;
  requestedScope: ChatScopeRequest;
}
```

It returns:

```ts
{
  scope: TrustedChatScope;
  memory: {
    resource: `user:${userId}:role:${role}`;
    thread: string;
  };
  system: string;
  context: Array<{ role: "system"; content: string }>;
}
```

Thread formats:

- General: `user:<uuid>:role:<role>:general`
- Resource: `user:<uuid>:role:<role>:<type>:<id>`

Bound trusted profile context before serialization. Do not include contact email,
salary expectation, access tokens, or full CV text.

- [ ] **Step 5: Add initial resource authorization**

Implement only resources represented by current server data:

- Candidate may access general chat, their own candidate profile, and visible demo jobs.
- Recruiter may access general chat and their own recruiter/company profile.
- Recruiter job/candidate/application ownership stays denied until those domains move to server persistence.

Return `resource-forbidden` instead of silently widening scope.

- [ ] **Step 6: Verify**

```powershell
node --import tsx --test apps/web/test/chat-server-scope.test.ts apps/web/test/chat-thread.test.ts
npm.cmd run typecheck --workspace=@shire/web
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add -- apps/web/lib/chat apps/web/test/chat-server-scope.test.ts apps/web/test/chat-thread.test.ts
git commit -m "feat(web): derive role-isolated chat scope"
```

---

### Task 6: Secure the Next.js Chat Proxy with Privy

**Files:**
- Modify: `apps/web/app/api/chat/[scope]/route.ts`
- Modify: `apps/web/components/ai/chat-shell.tsx`
- Modify: `apps/web/components/ai/chat-panel.tsx`
- Modify: `apps/web/test/chat-route.test.ts`

- [ ] **Step 1: Rewrite route tests first**

Add tests proving:

```ts
test("chat rejects a missing Privy token when Privy is configured");
test("chat ignores spoofed viewer and memory identifiers");
test("chat rejects a role without a saved profile");
test("chat forwards a server-generated role-specific memory key");
test("chat forwards trusted candidate name context");
test("chat sends the internal service token to the agent");
```

Use a `createChatPostHandler(dependencies)` factory to inject auth, repository,
and fetch.

- [ ] **Step 2: Run and verify RED**

```powershell
node --import tsx --test apps/web/test/chat-route.test.ts
```

Expected: spoofing and token tests FAIL against the current pass-through route.

- [ ] **Step 3: Implement the secured chat proxy**

The handler must:

1. Parse only `role`, requested resource, and messages.
2. Verify Privy access token.
3. Resolve the internal Shire user.
4. Load and validate the requested role profile.
5. Return `403 role-not-active` when absent.
6. Build trusted chat context.
7. Forward only the rebuilt body.
8. Add `Authorization: Bearer <SHIRE_AGENT_SERVICE_TOKEN>`.

Never forward client-provided `system`, `context`, `memory`, `viewerId`,
`threadId`, or `resourceKey`.

- [ ] **Step 4: Add dynamic Privy authorization to Assistant UI**

`ChatPanel` uses the shared `useAccessToken` hook and configures
`AssistantChatTransport` with dynamic headers:

```ts
headers: async () => {
  const token = await accessToken();
  return token ? { authorization: `Bearer ${token}` } : {};
},
```

`prepareSendMessagesRequest` sends:

```ts
{
  body: {
    role: scope.role,
    resourceType: scope.resourceType,
    resourceId: scope.resourceId,
    resourceLabel: scope.resourceLabel,
    messages,
  },
}
```

- [ ] **Step 5: Verify**

```powershell
node --import tsx --test apps/web/test/chat-route.test.ts apps/web/test/chat-thread.test.ts apps/web/test/chat-server-scope.test.ts
npm.cmd run test --workspace=@shire/web
npm.cmd run typecheck --workspace=@shire/web
```

Run ESLint on `chat-shell.tsx`, `chat-panel.tsx`, and the chat route.

- [ ] **Step 6: Commit**

```powershell
git add -- apps/web/app/api/chat apps/web/components/ai apps/web/test/chat-route.test.ts
git commit -m "feat(web): authenticate and isolate chat requests"
```

---

### Task 7: Require Internal Authentication on Agent Chat

**Files:**
- Modify: `apps/agent/src/server.ts`
- Modify: `apps/agent/test/server.test.ts`
- Modify: `apps/agent/test/jobs-http.test.ts`

- [ ] **Step 1: Add failing agent authorization tests**

Test:

```ts
test("chat rejects requests without the service token");
test("chat rejects an invalid service token");
test("chat accepts the configured service token");
test("health remains public");
```

Pass `serviceToken: "service-secret"` into `createRuntimeHttpServer`.

- [ ] **Step 2: Run and verify RED**

```powershell
node --import tsx --test apps/agent/test/server.test.ts
```

Expected: unauthenticated chat currently reaches the route, so the new tests fail.

- [ ] **Step 3: Add chat service-token middleware**

Before chat logging, validation, retrieval, and Mastra handling:

```ts
app.use("/chat/:agentId", (request, response, next) => {
  if (!hasValidServiceToken(request.header("authorization"), serviceToken)) {
    response.status(401).json({ status: "unauthorized" });
    return;
  }
  next();
});
```

Keep `/health` and `/ready` public. Existing chat tests must send the service
token; tests that intentionally verify rejection omit or alter it.

- [ ] **Step 4: Verify**

```powershell
npm.cmd run test --workspace=@shire/agent
npm.cmd run typecheck --workspace=@shire/agent
npm.cmd run build --workspace=@shire/agent
```

Expected: PASS, with the live LLM test still skipped unless explicitly enabled.

- [ ] **Step 5: Commit**

```powershell
git add -- apps/agent/src/server.ts apps/agent/test/server.test.ts apps/agent/test/jobs-http.test.ts
git commit -m "feat(agent): require service auth for chat"
```

---

### Task 8: Enforce Active Roles in Navigation

**Files:**
- Create: `apps/web/lib/role-client.ts`
- Create: `apps/web/test/role-client.test.ts`
- Modify: `apps/web/components/layout/role-switcher.tsx`
- Modify: `apps/web/app/onboarding/page.tsx`

- [ ] **Step 1: Write failing role tests**

Test role derivation from profile results:

```ts
test("candidate profile activates only candidate");
test("both profiles activate candidate and recruiter");
test("missing recruiter profile routes to recruiter onboarding");
test("admin is not exposed as a user-switchable role");
```

- [ ] **Step 2: Verify RED**

```powershell
node --import tsx --test apps/web/test/role-client.test.ts
```

Expected: FAIL because the role client does not exist.

- [ ] **Step 3: Implement role discovery**

Load candidate and recruiter profiles with the same Privy token and derive:

```ts
type ActiveRoleState = {
  candidate: boolean;
  recruiter: boolean;
};
```

A `404` means inactive. Other failures remain visible errors.

- [ ] **Step 4: Update role switching**

- Remove `admin` from the normal role switcher.
- Active roles navigate to their dashboards.
- Inactive roles navigate to matching onboarding.
- Selecting a role does not create or mutate role activation state.
- Onboarding no longer calls `registerUser` before profile save.

Keep the existing simulated on-chain state separate until registry integration is implemented.

- [ ] **Step 5: Verify**

```powershell
node --import tsx --test apps/web/test/role-client.test.ts
npm.cmd run test --workspace=@shire/web
npm.cmd run typecheck --workspace=@shire/web
```

Run ESLint on changed navigation components.

- [ ] **Step 6: Commit**

```powershell
git add -- apps/web/lib/role-client.ts apps/web/test/role-client.test.ts apps/web/components/layout/role-switcher.tsx apps/web/app/onboarding/page.tsx
git commit -m "feat(web): gate role switching by saved profiles"
```

---

### Task 9: Environment, Database, and End-to-End Verification

**Files:**
- Modify: `README.md`
- Modify: `apps/web/.env.example`
- Modify: `apps/agent/README.md`

- [ ] **Step 1: Document startup and security model**

Document:

- Required `DATABASE_URL` and `DIRECT_DATABASE_URL`.
- Same `SHIRE_AGENT_SERVICE_TOKEN` in web and agent.
- Privy app ID/secret requirements.
- One Privy login can own two role profiles.
- Role is activated only after profile save.
- Agent command still starts HTTP and BullMQ worker together.

- [ ] **Step 2: Apply and verify the migration**

Run the checked-in Drizzle migration against the configured hosted Postgres
project:

```powershell
npm.cmd run db:migrate --workspace=@shire/web
```

Verify:

```sql
select relname, relrowsecurity
from pg_class
where relname in ('app_users', 'candidate_profiles', 'recruiter_profiles');
```

Expected: all three rows have `relrowsecurity = true`.

Verify public access is revoked and use the server client to insert one user
with both profiles, read both, then remove the test rows.

- [ ] **Step 3: Run complete automated verification**

```powershell
npm.cmd run test --workspace=@shire/web
npm.cmd run test --workspace=@shire/agent
npm.cmd run typecheck --workspace=@shire/web
npm.cmd run typecheck --workspace=@shire/agent
npm.cmd run build --workspace=@shire/web
npm.cmd run build --workspace=@shire/agent
git diff --check
```

Expected:

- All unit and route tests pass.
- Agent live LLM test may remain skipped.
- Both production builds pass.
- Generated `apps/web/next-env.d.ts` changes are restored if the build rewrites them.

- [ ] **Step 4: Perform authenticated manual verification**

With web and agent services running:

1. Sign in with Privy account A.
2. Save candidate profile as `M. Zaky Arisandhi`.
3. Ask candidate chat "nama aku siapa?" and verify the saved name is used.
4. Start recruiter chat before recruiter onboarding and verify `403 role-not-active`.
5. Complete recruiter profile and verify recruiter chat starts with a separate history.
6. Switch back to candidate and verify candidate history remains intact.
7. Sign in with Privy account B and verify no profile or chat history from account A appears.
8. Inspect the outgoing web request and confirm it contains no trusted viewer ID, memory keys, or system identity context.

- [ ] **Step 5: Commit documentation**

```powershell
git add -- README.md apps/web/.env.example apps/agent/README.md
git commit -m "docs: document Privy role persistence"
```

- [ ] **Step 6: Final branch audit**

```powershell
git status --short
git log --oneline --decorate -12
```

Expected: worktree is clean and commits are split by database, identity,
profiles, chat, agent security, navigation, and documentation.
