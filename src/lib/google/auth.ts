import { getToken } from "next-auth/jwt";
import { type NextRequest } from "next/server";
import { google } from "googleapis";

/**
 * Retrieves the Google OAuth access token from the session JWT.
 *
 * Must only be called from server-side API route handlers. The token is never
 * placed in the client-facing session (Section 4.2), so it is read directly
 * from the JWT via getToken(), which decodes the httpOnly session cookie.
 *
 * Throws if the user is unauthenticated, the token is missing, or the token
 * could not be refreshed (user must re-authenticate).
 */
export async function getGoogleAccessToken(req: NextRequest): Promise<string> {
  const token = await getToken({ req });

  if (!token) {
    throw new Error("Unauthenticated: no session found.");
  }

  if (token.error === "RefreshTokenError") {
    throw new Error(
      "Google OAuth token expired and could not be refreshed. Please sign in again."
    );
  }

  if (!token.access_token) {
    throw new Error("No Google access token present in session.");
  }

  return token.access_token;
}

/**
 * Constructs a googleapis OAuth2 client pre-loaded with the given access
 * token. Used by all Google API client modules in this directory.
 */
export function buildGoogleAuthClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}
