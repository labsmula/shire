import { PrivyClient } from "@privy-io/node";

export class CandidateAuthenticationError extends Error {}

type IdentityDependencies = {
  appId?: string;
  appSecret?: string;
  verifyAccessToken: (token: string) => Promise<{ userId: string }>;
};

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : undefined;
}

export async function resolveCandidateIdentity(
  request: Request,
  dependencies?: IdentityDependencies,
) {
  const appId =
    dependencies?.appId ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();
  const appSecret =
    dependencies?.appSecret ?? process.env.PRIVY_APP_SECRET?.trim();
  if (!appId || !appSecret) {
    return "me_candidate";
  }

  const token = bearerToken(request);
  if (!token) {
    throw new CandidateAuthenticationError("Authentication is required.");
  }

  const verifyAccessToken =
    dependencies?.verifyAccessToken ??
    (async (accessToken: string) => {
      const client = new PrivyClient({ appId, appSecret });
      const claims = await client.utils().auth().verifyAccessToken(accessToken);
      return { userId: claims.user_id };
    });

  try {
    return (await verifyAccessToken(token)).userId;
  } catch {
    throw new CandidateAuthenticationError("Authentication token is invalid.");
  }
}
