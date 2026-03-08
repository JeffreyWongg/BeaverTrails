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

  // Transform scroll progress to globe position
  // L-shaped path: down (0-40%), left (40-70%), down-left (70-100%)
  const x = useTransform(scrollProgress, [0, 0.4, 0.7, 1], ["25%", "25%", "-25%", "-25%"]);
  const y = useTransform(scrollProgress, [0, 0.4, 0.7, 1], ["-50%", "-20%", "-20%", "0%"]);
  const scale = useTransform(scrollProgress, [0, 0.7, 1], [1, 1, 0.85]);

  return (
    <motion.div
      className="fixed top-1/2 right-0 z-0"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        x,
        y,
        scale,
      }}
    >
      <Globe width={dimensions.width} height={dimensions.height} />
    </motion.div>
  );
}
