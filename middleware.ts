import { auth0 } from "./lib/auth0";
import type { NextRequest } from "next/server";

// Next.js 14: use middleware.ts (Auth0 v4 proxy-style setup)
export async function middleware(request: NextRequest) {
  const authResponse = await auth0.middleware(request);
  return authResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
