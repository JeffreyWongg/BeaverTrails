"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";

// Dynamically import Globe with SSR disabled (needs WebGL / window)
const Globe = dynamic(() => import("./Globe"), {
  ssr: false,
  loading: () => null,
});

export default function HeroGlobe() {
  const [dimensions, setDimensions] = useState({ width: 1200, height: 1200 });
  const containerRef = useRef<HTMLDivElement>(null);

  const updateDimensions = useCallback(() => {
    // Globe sized large for dramatic cropping at viewport edges
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const size = Math.max(vw, vh) * 1.4;
    setDimensions({ width: size, height: size });
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [updateDimensions]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Center the globe on the bottom-right corner of the viewport */}
      <div
        className="absolute"
        style={{
          right: `-${dimensions.width * 0.38}px`,
          bottom: `-${dimensions.height * 0.42}px`,
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
        }}
      >
        <Globe width={dimensions.width} height={dimensions.height} />
      </div>
    </div>
  );
}
