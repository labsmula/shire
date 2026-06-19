export type ProfileRole = "candidate" | "recruiter";

export class ProfileClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ProfileUnauthorizedError extends ProfileClientError {
  constructor() {
    super("Authentication is required.");
  }
}

export class ProfileForbiddenError extends ProfileClientError {
  constructor() {
    super("This profile is not available for the current user.");
  }
}

export class ProfileNotFoundError extends ProfileClientError {
  constructor() {
    super("Profile not found.");
  }
}

export class ProfileServerError extends ProfileClientError {
  constructor() {
    super("Profile service failed.");
  }
}

export class InvalidProfileResponseError extends ProfileClientError {
  constructor() {
    super("Profile service returned an invalid response.");
  }
}

function profileUrl(role: ProfileRole) {
  return `/api/profiles/${role}`;
}

function authorizationHeaders(accessToken?: string) {
  const headers: Record<string, string> = {};
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  return headers;
}

type ProfileCacheEntry = {
  expiresAt: number;
  promise: Promise<unknown>;
};

const PROFILE_CACHE_TTL_MS = 15_000;
const profileCache = new Map<string, ProfileCacheEntry>();

function profileCacheKey(role: ProfileRole, accessToken?: string) {
  return `${role}:${accessToken ?? "demo"}`;
}

function clearProfileCache(role?: ProfileRole, accessToken?: string) {
  if (role) {
    profileCache.delete(profileCacheKey(role, accessToken));
    return;
  }
  profileCache.clear();
}

async function readProfileResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) throw new ProfileUnauthorizedError();
  if (response.status === 403) throw new ProfileForbiddenError();
  if (response.status === 404) throw new ProfileNotFoundError();
  if (response.status >= 500) throw new ProfileServerError();
  if (!response.ok) throw new ProfileClientError("Profile request failed.");

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new InvalidProfileResponseError();
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("profile" in body) ||
    body.profile === undefined ||
    body.profile === null
  ) {
    throw new InvalidProfileResponseError();
  }

  return body.profile as T;
}

export async function getProfile<T>(
  role: ProfileRole,
  accessToken?: string,
  fetcher: typeof fetch = fetch,
): Promise<T> {
  if (fetcher !== fetch) {
    const response = await fetcher(profileUrl(role), {
      method: "GET",
      headers: authorizationHeaders(accessToken),
    });

    return readProfileResponse<T>(response);
  }

  const key = profileCacheKey(role, accessToken);
  const cached = profileCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise as Promise<T>;
  }

  const promise = fetcher(profileUrl(role), {
    method: "GET",
    headers: authorizationHeaders(accessToken),
  })
    .then((response) => readProfileResponse<T>(response))
    .catch((error) => {
      profileCache.delete(key);
      throw error;
    });

  profileCache.set(key, {
    expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
    promise,
  });

  return promise;
}

export async function saveProfile<TResponse, TPayload = TResponse>(
  role: ProfileRole,
  profile: TPayload,
  accessToken?: string,
  fetcher: typeof fetch = fetch,
): Promise<TResponse> {
  clearProfileCache(role, accessToken);
  const response = await fetcher(profileUrl(role), {
    method: "PUT",
    headers: {
      ...authorizationHeaders(accessToken),
      "content-type": "application/json",
    },
    body: JSON.stringify(profile),
  });

  const saved = await readProfileResponse<TResponse>(response);
  clearProfileCache(role, accessToken);
  return saved;
}
