import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const unauthenticated =
    !req.auth || req.auth.error === "RefreshTokenError";

  if (!unauthenticated) return;

  // API routes must return 401 JSON — a redirect produces HTML and breaks
  // programmatic callers. Section 6: "unauthenticated requests return 401".
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // Page routes redirect to Google sign-in.
  // Section 4.3: "if a token is expired, the user is prompted to re-authenticate"
  return NextResponse.redirect(new URL("/api/auth/signin", req.url));
});

export const config = {
  // Protect all routes except the NextAuth endpoints, static assets, and favicon.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
