"use client";

import Link from "next/link";
import AuthNav from "@/components/AuthNav";

export default function PlanPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <nav className="flex items-center justify-between px-6 md:px-12 py-6">
        <Link href="/" className="text-white text-lg tracking-wide">
          BeaverTrails
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-white/70 hover:text-white text-sm transition-colors"
          >
            Home
          </Link>
          <AuthNav />
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-lg text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl text-white font-medium tracking-tight mb-4">
            Start your travel plan
          </h1>
          <p className="text-white/70 text-lg md:text-xl mb-12 max-w-md mx-auto">
            Answer a few questions and we&apos;ll build a personalized Canadian
            itinerary just for you.
          </p>

          <Link
            href="/survey"
            className="inline-flex items-center justify-center gap-3 w-full max-w-sm mx-auto px-8 py-4 border border-white/20 text-white rounded-full text-lg font-medium glow-button hover:border-white/35 hover:bg-white/5 transition-all duration-200"
          >
            Start new travel plan
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </Link>

          <p className="mt-8 text-white/50 text-sm">
            You&apos;ll choose your preferences, then get a custom trip plan.
          </p>
        </div>
      </main>
    </div>
  );
}
