"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

const SurveyGlobe3D = dynamic(() => import("./SurveyGlobe3D"), {
  ssr: false,
  loading: () => null,
});

export default function SurveyGlobe() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const update = () => {
      const size = Math.max(window.innerWidth, window.innerHeight) * 1.7;
      setDimensions({ width: size, height: size });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleReady = useCallback(() => setReady(true), []);

  if (!dimensions.width) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none select-none overflow-hidden"
      style={{
        opacity: ready ? 0.4 : 0,
        transition: "opacity 2s ease",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: dimensions.width,
          height: dimensions.height,
        }}
      >
        <SurveyGlobe3D
          width={dimensions.width}
          height={dimensions.height}
          onReady={handleReady}
        />
      </div>
    </div>
  );
}
