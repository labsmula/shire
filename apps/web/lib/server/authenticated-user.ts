import { PrivyClient } from "@privy-io/node";

export class AuthenticatedUserError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AuthenticatedUserError";
  }
}

export class AuthenticatedUserConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticatedUserConfigurationError";
  }
}

export type AuthenticatedUser =
  | { mode: "demo"; privyUserId: "demo-user" }
  | { mode: "privy"; privyUserId: string };

export type AuthenticatedUserDependencies = {
  appId?: string;
  appSecret?: string;
  nodeEnv?: string;
  verifyAccessToken?: (token: string) => Promise<{ userId: string }>;
};

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return undefined;
  }

  const match = /^Bearer\s+(\S+)$/i.exec(authorization);
  return match?.[1];
}

export async function resolveAuthenticatedUser(
  request: Request,
  dependencies?: AuthenticatedUserDependencies,
): Promise<AuthenticatedUser> {
  const appId = (
    dependencies
      ? dependencies.appId
      : process.env.NEXT_PUBLIC_PRIVY_APP_ID
  )?.trim();
  const appSecret = (
    dependencies ? dependencies.appSecret : process.env.PRIVY_APP_SECRET
  )?.trim();
  const nodeEnv = dependencies?.nodeEnv ?? process.env.NODE_ENV;

  if (!appId && !appSecret) {
    if (nodeEnv === "production") {
      throw new AuthenticatedUserConfigurationError(
        "Privy server authentication is not configured.",
      );
    }
    return { mode: "demo", privyUserId: "demo-user" };
  }
  if (!appId || !appSecret) {
    throw new AuthenticatedUserConfigurationError(
      "Privy server authentication is partially configured.",
    );
  }

  const token = bearerToken(request);
  if (!token) {
    throw new AuthenticatedUserError("Authentication is required.");
  }

  const verifyAccessToken =
    dependencies?.verifyAccessToken ??
    (async (accessToken: string) => {
      const client = new PrivyClient({ appId, appSecret });
      const claims = await client.utils().auth().verifyAccessToken(accessToken);
      return { userId: claims.user_id };
    });

  try {
    const { userId } = await verifyAccessToken(token);
    if (!userId?.trim()) {
      throw new Error("Verified token did not include a user ID.");
    }
    return { mode: "privy", privyUserId: userId };
  } catch (error) {
    throw new AuthenticatedUserError("Authentication token is invalid.", {
      cause: error,
    });
  }
}
