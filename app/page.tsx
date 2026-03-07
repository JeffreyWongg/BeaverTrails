"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import HeroGlobe from "@/components/HeroGlobe";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black">
      {/* Globe - positioned bottom-right, partially cropped */}
      <div className="absolute inset-0 z-0">
        <HeroGlobe />
      </div>

      {/* Hero Text - left side */}
      <div className="relative z-10 flex flex-col justify-center min-h-screen px-8 md:px-16 lg:px-24 max-w-2xl">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-6xl md:text-7xl lg:text-8xl font-serif text-white mb-6 leading-tight"
        >
          Discover Canada
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="text-xl md:text-2xl text-white/80 font-light mb-12 leading-relaxed"
        >
          A night of inspiration, connection, and a chance to make a real impact
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
        >
          <Link href="/survey">
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.15)", borderColor: "rgba(255, 255, 255, 0.4)" }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-black border border-white/20 text-white rounded-full font-medium text-lg tracking-wide transition-all duration-300 flex items-center justify-center gap-2 group"
            >
              see us
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
