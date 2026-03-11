import { auth } from "@/auth";
import { type NextRequest } from "next/server";
import { google } from "googleapis";

export async function getGoogleAccessToken(_req: NextRequest): Promise<string> {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthenticated: no session found.");
  }

  if (session.error === "RefreshTokenError") {
    throw new Error(
      "Google OAuth token expired and could not be refreshed. Please sign in again."
    );
  }

  if (!session.access_token) {
    throw new Error("No Google access token present in session.");
  }

  return session.access_token;
}

export function buildGoogleAuthClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}