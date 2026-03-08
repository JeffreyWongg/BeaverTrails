"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import HeroGlobe from "@/components/HeroGlobe";

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Fade in second section text as we approach the end
  const section2Opacity = useTransform(scrollYProgress, [0.7, 1], [0, 1]);

  return (
    <div ref={containerRef} className="relative bg-black">
      {/* ── Globe (fixed, moves via scroll) — placed first so it's behind everything ── */}
      <HeroGlobe scrollProgress={scrollYProgress} />

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-20 px-8 md:px-12 lg:px-16 xl:px-20 py-6"
      >
        <div className="flex items-center justify-between">
          <Link href="/" className="text-white text-lg tracking-wide">
            BeaverTrails
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/explore"
              className="text-white/80 hover:text-white text-sm transition-colors duration-200"
            >
              Explore
            </Link>
            <Link
              href="/plan"
              className="text-white/80 hover:text-white text-sm transition-colors duration-200"
            >
              Plan Trip
            </Link>
            <Link
              href="/about"
              className="text-white/80 hover:text-white text-sm transition-colors duration-200"
            >
              About
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ── Section 1: Hero ── */}
      <section className="h-screen relative z-10">
        <div className="h-full grid grid-cols-1 md:grid-cols-2">
          {/* Left: Text */}
          <div className="flex flex-col justify-center px-8 md:px-12 lg:px-16 xl:px-20 relative z-10">
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-white leading-tight tracking-tight mb-6"
            >
              Discover Canada
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-white/80 leading-relaxed mb-10 max-w-md"
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
                className="inline-flex items-center gap-3 px-7 py-3.5 border border-white/20 text-white rounded-full text-lg md:text-xl leading-relaxed group glow-button"
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

          {/* Right: empty — globe is fixed-positioned */}
          <div />
        </div>
      </section>

      {/* ── Scroll spacer ── */}
      <div className="h-screen relative z-10" />

      {/* ── Section 2: New content ── */}
      <section className="h-screen relative z-10">
        <div className="h-full grid grid-cols-1 md:grid-cols-2">
          {/* Left: empty — globe animates here */}
          <div />

          {/* Right: Text */}
          <motion.div
            style={{ opacity: section2Opacity }}
            className="flex flex-col justify-center px-8 md:px-12 lg:px-16 xl:px-20 relative z-10"
          >
            <h2 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-white leading-tight tracking-tight mb-6">
              Plan Your Journey
            </h2>
            <p className="text-lg md:text-xl text-white/80 leading-relaxed mb-10 max-w-md">
              Create custom itineraries and discover hidden gems across
              Canada&apos;s diverse landscapes.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
