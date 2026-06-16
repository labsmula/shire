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
  const response = await fetcher(profileUrl(role), {
    method: "GET",
    headers: authorizationHeaders(accessToken),
  });

  return readProfileResponse<T>(response);
}

export async function saveProfile<TResponse, TPayload = TResponse>(
  role: ProfileRole,
  profile: TPayload,
  accessToken?: string,
  fetcher: typeof fetch = fetch,
): Promise<TResponse> {
  const response = await fetcher(profileUrl(role), {
    method: "PUT",
    headers: {
      ...authorizationHeaders(accessToken),
      "content-type": "application/json",
    },
    body: JSON.stringify(profile),
  });

  return readProfileResponse<TResponse>(response);
}
