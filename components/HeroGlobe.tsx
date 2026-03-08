"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";

const Globe = dynamic(() => import("./Globe"), {
  ssr: false,
  loading: () => null,
});

export default function HeroGlobe() {
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

  return (
    <div
      className="fixed top-1/2 right-0 z-0"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        transform: "translate(25%, -50%)",
      }}
    >
      <Globe width={dimensions.width} height={dimensions.height} />
    </div>
  );
}
