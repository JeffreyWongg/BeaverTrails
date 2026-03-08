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

  // Fade in section text at the right scroll positions (5 viewport-height container)
  const section2Opacity = useTransform(scrollYProgress, [0.35, 0.5], [0, 1]);
  const section3Opacity = useTransform(scrollYProgress, [0.8, 0.92], [0, 1]);

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

      {/* ── Section 2: Workflow ── */}
      <section className="h-screen relative z-10">
        <div className="h-full grid grid-cols-1 md:grid-cols-2">
          {/* Left: empty — globe animates here */}
          <div />

          {/* Right: Text */}
          <motion.div
            style={{ opacity: section2Opacity }}
            className="flex flex-col justify-center px-8 md:px-12 lg:px-16 xl:px-20 relative z-10"
          >
            <h2 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-white leading-tight tracking-tight mb-8">
              How It Works
            </h2>
            
            <div className="space-y-6 max-w-lg">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full border border-white/30 flex items-center justify-center text-white/80 text-sm font-medium mt-1">
                  1
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl text-white mb-2">Answer a Few Questions</h3>
                  <p className="text-base md:text-lg text-white/70 leading-relaxed">
                    Tell us about your interests, travel style, and what you&apos;d like to experience.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full border border-white/30 flex items-center justify-center text-white/80 text-sm font-medium mt-1">
                  2
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl text-white mb-2">Get Personalized Recommendations</h3>
                  <p className="text-base md:text-lg text-white/70 leading-relaxed">
                    We&apos;ll suggest trails, cities, and hidden gems tailored to your preferences.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full border border-white/30 flex items-center justify-center text-white/80 text-sm font-medium mt-1">
                  3
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl text-white mb-2">Build Your Itinerary</h3>
                  <p className="text-base md:text-lg text-white/70 leading-relaxed">
                    Customize your route, add stops, and plan the perfect Canadian adventure.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Scroll spacer 2 ── */}
      <div className="h-screen relative z-10" />

      {/* ── Section 3: Features ── */}
      <section className="h-screen relative z-10">
        <motion.div
          style={{ opacity: section3Opacity }}
          className="h-full flex flex-col justify-start pt-20 md:pt-24 px-8 md:px-12 lg:px-16 xl:px-20"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 max-w-6xl mx-auto w-full">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-white/80"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
              </div>
              <h3 className="text-2xl md:text-3xl text-white mb-4 font-medium">Trail Discovery</h3>
              <p className="text-base md:text-lg text-white/70 leading-relaxed max-w-xs">
                Explore thousands of curated trails, from coastal walks to mountain peaks across Canada.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-white/80"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <h3 className="text-2xl md:text-3xl text-white mb-4 font-medium">Smart Planning</h3>
              <p className="text-base md:text-lg text-white/70 leading-relaxed max-w-xs">
                AI-powered suggestions help you build the perfect itinerary based on your preferences and time.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-white/80"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl md:text-3xl text-white mb-4 font-medium">Community Insights</h3>
              <p className="text-base md:text-lg text-white/70 leading-relaxed max-w-xs">
                Learn from fellow explorers and discover hidden gems shared by the community.
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
