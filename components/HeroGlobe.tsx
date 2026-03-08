"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
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
    // Globe size based on viewport, not container - can grow freely
    const size = Math.max(window.innerWidth, window.innerHeight) * 1.5;
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

  // Transform scroll progress to globe position across 3 sections (5 viewport heights)
  // Section 1 (0–0.2): hero, right side, large
  // Transition (0.2–0.5): shrink + move left
  // Section 2 (0.5–0.6): left column, small
  // Transition (0.6–0.85): swoop to bottom center, grow large
  // Section 3 (0.85–1): bottom center, very large, low position (line effect)
  const x = useTransform(
    scrollProgress,
    [0, 0.2, 0.5, 0.6, 0.85, 1],
    ["25%", "25%", "0%", "0%", "17%", "17%"]
  );
  const y = useTransform(
    scrollProgress,
    [0, 0.2, 0.5, 0.6, 0.85, 1],
    ["-50%", "-50%", "-50%", "-50%", "5%", "5%"]
  );
  const scale = useTransform(
    scrollProgress,
    [0, 0.2, 0.5, 0.6, 0.85, 1],
    [1, 1, 0.3, 0.3, 1.4, 1.4]
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
          "radial-gradient(ellipse 50% 50% at center, black 30%, transparent 70%)",
        maskImage:
          "radial-gradient(ellipse 50% 50% at center, black 30%, transparent 70%)",
        opacity: 0.85,
      }}
    >
      <Globe width={dimensions.width} height={dimensions.height} />
    </motion.div>
  );
}
