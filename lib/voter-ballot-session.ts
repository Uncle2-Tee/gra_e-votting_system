import "server-only";

export const VOTER_CREDENTIAL_COOKIE_PREFIX = "gra_voter_id_";

export function getVoterCredentialCookieName(electionId: string) {
  return `${VOTER_CREDENTIAL_COOKIE_PREFIX}${electionId}`;
}
