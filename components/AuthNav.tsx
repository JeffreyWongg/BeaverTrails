"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import Link from "next/link";

export default function AuthNav() {
  const { user, isLoading } = useUser();

  if (isLoading) return null;

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-white/70 text-sm truncate max-w-[120px]">
          {user.name ?? user.email}
        </span>
        <a
          href="/auth/logout"
          className="text-white/80 hover:text-white text-sm transition-colors duration-200"
        >
          Log out
        </a>
      </div>
    );
  }

  return (
    <Link
      href="/auth/login"
      className="text-white/80 hover:text-white text-sm transition-colors duration-200"
    >
      Log in
    </Link>
  );
}
