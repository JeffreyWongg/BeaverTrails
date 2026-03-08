"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      fetch("/api/auth/sync-supabase", { method: "POST" }).finally(() => {
        router.push("/plan");
      });
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/80 text-lg">Loading...</div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/80 text-lg">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <Link
          href="/"
          className="text-white/70 hover:text-white text-sm transition-colors inline-block mb-12"
        >
          ← Back to BeaverTrails
        </Link>

        <h1 className="text-4xl md:text-5xl text-white font-medium tracking-tight mb-4">
          Sign in
        </h1>
        <p className="text-white/70 text-lg mb-12 max-w-sm mx-auto">
          Sign in with Auth0 to save your trips and preferences. Your data is
          stored securely with Supabase.
        </p>

        <a
          href="/auth/login"
          className="inline-flex items-center justify-center gap-3 w-full px-7 py-4 border border-white/20 text-white rounded-full text-lg font-medium glow-button hover:border-white/35 hover:bg-white/5 transition-all duration-200"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
          </svg>
          Continue with Auth0
        </a>

        <p className="mt-8 text-white/50 text-sm">
          By signing in, you agree to use Auth0 for authentication and Supabase
          for secure data storage.
        </p>
      </div>
    </div>
  );
}
