"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, useTransform, useSpring, type MotionValue } from "framer-motion";
import dynamic from "next/dynamic";

const Globe = dynamic(() => import("./Globe"), {
  ssr: false,
  loading: () => null,
});

interface HeroGlobeProps {
  scrollProgress: MotionValue<number>;
}

export default function HeroGlobe({ scrollProgress }: HeroGlobeProps) {
  const [dimensions, setDimensions] = useState({ width: 1200, height: 1200 });

  const updateDimensions = useCallback(() => {
    // Globe size based on viewport — kept moderate for scroll performance
    const size = Math.max(window.innerWidth, window.innerHeight) * 1.2;
    setDimensions({ width: size, height: size });
  }, []);

  // Preload globe resources as early as possible
  useEffect(() => {
    // Preload texture
    const img = new Image();
    img.src = "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
    
    // Prefetch TopoJSON data
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json", {
      cache: "force-cache",
    }).catch(() => {
      // Silent fail - Globe component will retry
    });
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [updateDimensions]);

  // Smooth the raw scroll progress with a spring so transforms interpolate fluidly
  const smoothProgress = useSpring(scrollProgress, {
    stiffness: 80,
    damping: 30,
    restDelta: 0.001,
  });

  // Transform scroll progress to globe position across 3 sections (5 viewport heights)
  // Section 1 (0–0.2): hero, right side, large
  // Transition (0.2–0.5): shrink + move to left column center
  // Section 2 (0.5–0.6): centered in left column, medium
  // Transition (0.6–0.85): swoop to bottom center
  // Section 3 (0.85–1): centered below features, large
  const x = useTransform(
    smoothProgress,
    [0, 0.2, 0.5, 0.6, 0.85, 1],
    ["25%", "25%", "-12%", "-12%", "5%", "5%"]
  );
  const y = useTransform(
    smoothProgress,
    [0, 0.2, 0.5, 0.6, 0.85, 1],
    ["-50%", "-50%", "-47%", "-47%", "-5%", "-5%"]
  );
  const scale = useTransform(
    smoothProgress,
    [0, 0.2, 0.5, 0.6, 0.85, 1],
    [1, 1, 0.5, 0.5, 1.1, 1.1]
  );

  return (
    <motion.div
      className="fixed top-1/2 right-0 z-0"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        x,
        y,
        scale,
        // Radial mask: globe fades smoothly to transparent at the edges
        WebkitMaskImage:
          "radial-gradient(ellipse 55% 55% at center, black 40%, transparent 78%)",
        maskImage:
          "radial-gradient(ellipse 55% 55% at center, black 40%, transparent 78%)",
        opacity: 0.85,
        willChange: "transform",
      }}
    >
      <Globe width={dimensions.width} height={dimensions.height} />
    </motion.div>
  );
}
