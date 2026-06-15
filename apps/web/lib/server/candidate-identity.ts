import {
  AuthenticatedUserConfigurationError,
  AuthenticatedUserError,
  resolveAuthenticatedUser,
  type AuthenticatedUserDependencies,
} from "./authenticated-user";

export { AuthenticatedUserError as CandidateAuthenticationError };
export {
  AuthenticatedUserConfigurationError as CandidateAuthenticationConfigurationError,
};

export async function resolveCandidateIdentity(
  request: Request,
  dependencies?: AuthenticatedUserDependencies,
) {
  return (await resolveAuthenticatedUser(request, dependencies)).privyUserId;
}
