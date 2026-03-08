"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import HeroGlobe from "@/components/HeroGlobe";

export default function Home() {
  return (
    <main className="relative h-screen bg-black overflow-hidden">
      {/* ── Navbar ── */}
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="absolute top-0 left-0 right-0 z-20 px-8 md:px-12 lg:px-16 py-6"
      >
        <div className="flex items-center justify-between">
          <Link href="/" className="text-white text-lg tracking-wide">
            BeaverTrails
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/explore"
              className="text-white/40 hover:text-white text-sm transition-colors duration-200"
            >
              Explore
            </Link>
            <Link
              href="/plan"
              className="text-white/40 hover:text-white text-sm transition-colors duration-200"
            >
              Plan Trip
            </Link>
            <Link
              href="/about"
              className="text-white/40 hover:text-white text-sm transition-colors duration-200"
            >
              About
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ── Two-column grid ── */}
      <div className="h-full grid grid-cols-1 md:grid-cols-2">
        {/* Left: Text */}
        <div className="flex flex-col justify-center px-8 md:px-12 lg:px-16 xl:px-20">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="text-5xl md:text-6xl text-white leading-tight tracking-tight mb-6"
          >
            Discover Canada
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-white/50 leading-relaxed mb-10 max-w-md"
          >
            Explore trails, cities, and hidden places across the country.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
          >
            <Link
              href="/survey"
              className="inline-flex items-center gap-3 px-7 py-3.5 border border-white/15 text-white rounded-full text-sm tracking-wide hover:bg-white/5 hover:border-white/30 transition-all duration-300 group"
            >
              Start Planning
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200"
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
          </motion.div>
        </div>

        {/* Right: Globe */}
        <div className="relative overflow-hidden">
          <HeroGlobe />

          {/* Left edge fade — blends globe into text column */}
          <div
            className="absolute inset-y-0 left-0 w-28 pointer-events-none z-10"
            style={{
              background: "linear-gradient(to right, black, transparent)",
            }}
          />

          {/* Bottom edge fade */}
          <div
            className="absolute inset-x-0 bottom-0 h-24 pointer-events-none z-10"
            style={{
              background: "linear-gradient(to top, black, transparent)",
            }}
          />

          {/* Top edge fade */}
          <div
            className="absolute inset-x-0 top-0 h-24 pointer-events-none z-10"
            style={{
              background: "linear-gradient(to bottom, black, transparent)",
            }}
          />
        </div>
      </div>
    </main>
  );
}
