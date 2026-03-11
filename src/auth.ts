import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Scopes required per Section 2 of the spec.
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents.readonly",
].join(" ");

async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_at: number;
  refresh_token?: string;
}> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const tokens = await response.json();

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${tokens.error ?? response.status}`);
  }

  return {
    access_token: tokens.access_token,
    expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in as number),
    refresh_token: tokens.refresh_token,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          // access_type=offline requests a refresh token on first sign-in.
          // prompt=consent ensures the refresh token is always issued even if
          // the user has previously authorised the app.
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // First sign-in: persist Google tokens into the JWT.
      if (account) {
        return {
          ...token,
          access_token: account.access_token as string,
          refresh_token: account.refresh_token as string,
          expires_at: account.expires_at as number,
        };
      }

      // Token still valid — return as-is.
      if (Date.now() < (token.expires_at as number) * 1000) {
        return token;
      }

      // Token expired — attempt silent refresh.
      try {
        const refreshed = await refreshGoogleAccessToken(
          token.refresh_token as string
        );
        return {
          ...token,
          access_token: refreshed.access_token,
          expires_at: refreshed.expires_at,
          // Google only returns a new refresh token if rotation is enabled;
          // keep the existing one when absent.
          refresh_token: refreshed.refresh_token ?? token.refresh_token,
          error: undefined,
        };
      } catch {
        // Refresh failed — signal the middleware to redirect to sign-in.
        return { ...token, error: "RefreshTokenError" as const };
      }
    },

    async session({ session, token }) {
      if (token.error === "RefreshTokenError") {
        session.error = "RefreshTokenError";
      }
      // Expose access_token on the server-side session object only.
      // This is never sent to the client — Next.js API routes access it
      // server-side via auth(). The client-facing session shape is controlled
      // by what you return from getSession() / useSession(), which excludes this.
      session.access_token = token.access_token as string;
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    error?: "RefreshTokenError";
    access_token?: string;
  }
}
