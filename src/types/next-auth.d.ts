import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    // Signals that the Google access token could not be refreshed.
    // The middleware intercepts this and redirects to sign-in.
    // access_token is intentionally absent — it lives in the JWT only.
    error?: "RefreshTokenError";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    error?: "RefreshTokenError";
  }
}
