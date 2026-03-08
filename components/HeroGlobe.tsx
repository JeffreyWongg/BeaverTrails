"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";

const Globe = dynamic(() => import("./Globe"), {
  ssr: false,
  loading: () => null,
});

export default function HeroGlobe() {
  const [dimensions, setDimensions] = useState({ width: 800, height: 800 });
  const containerRef = useRef<HTMLDivElement>(null);

  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Globe is 115% of the larger container dimension — slight overflow for drama
    const size = Math.max(rect.width, rect.height) * 1.15;
    setDimensions({ width: size, height: size });
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [updateDimensions]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Center the globe in the container via absolute + translate */}
      <div
        className="absolute top-1/2 left-1/2"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          transform: "translate(-50%, -50%)",
        }}
      >
        <Globe width={dimensions.width} height={dimensions.height} />
      </div>
    </div>
  );
}
