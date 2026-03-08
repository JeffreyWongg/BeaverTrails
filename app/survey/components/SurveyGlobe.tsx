"use client";

import { useState, useEffect } from "react";

/**
 * Lightweight CSS-only auto-rotating globe.
 * Uses a scrolling earth texture inside a clipped circle with a radial
 * gradient overlay for spherical shading — no WebGL, no Three.js.
 */
export default function SurveyGlobe() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setLoaded(true);
    img.src =
      "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
      <div
        className="relative rounded-full overflow-hidden"
        style={{
          width: "min(180vh, 180vw)",
          height: "min(180vh, 180vw)",
          opacity: loaded ? 0.4 : 0,
          transition: "opacity 3s ease",
        }}
      >
        {/* Rotating earth texture */}
        <div
          className="absolute top-0 left-0 h-full"
          style={{
            width: "200%",
            backgroundImage:
              "url(https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg)",
            backgroundSize: "50% 100%",
            backgroundRepeat: "repeat-x",
            animation: "survey-globe-spin 90s linear infinite",
          }}
        />

        {/* Spherical shading overlay */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, transparent 15%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0.7) 100%)",
          }}
        />
      </div>
    </div>
  );
}
