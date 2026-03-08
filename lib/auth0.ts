import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";

// Shared Auth0 instance for server-side session management (v4)
export const auth0 = new Auth0Client({
  httpTimeout: 15000, // 15s for discovery/token requests (default 5s can timeout on slow networks)
  signInReturnToPath: "/plan", // after login → start travel plan page, then user goes to survey
  onCallback: async (error, ctx, session) => {
    if (error) {
      const cause = (error as { cause?: { code?: string; message?: string } }).cause;
      console.error("[Auth0 callback error]", error.message, cause ? { code: cause.code, message: cause.message } : "");
      return new NextResponse(error.message, { status: 500 });
    }
    return NextResponse.redirect(new URL(ctx.returnTo ?? "/plan", ctx.appBaseUrl ?? "http://localhost:3000"));
  },
});
