"use client";

import { useRef, useCallback } from "react";
import GlobeGL from "react-globe.gl";
import type { GlobeMethods } from "react-globe.gl";

interface SurveyGlobe3DProps {
  width: number;
  height: number;
  onReady?: () => void;
}

export default function SurveyGlobe3D({ width, height, onReady }: SurveyGlobe3DProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);

  const handleGlobeReady = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;

    // Start looking at Canada
    globe.pointOfView({ lat: 45, lng: -90, altitude: 2.0 }, 0);

    // Slow auto-rotation, no zoom
    try {
      const controls = globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
      controls.enableZoom = false;
    } catch {}

    // Soften lighting
    try {
      const scene = globe.scene();
      if (scene) {
        scene.children.forEach((child: { type?: string; intensity?: number }) => {
          if (child.type === "DirectionalLight" && child.intensity !== undefined) {
            child.intensity = 0.8;
          }
          if (child.type === "AmbientLight" && child.intensity !== undefined) {
            child.intensity = 0.6;
          }
        });
      }
    } catch {}

    onReady?.();
  }, [onReady]);

  return (
    <GlobeGL
      ref={globeRef}
      width={width}
      height={height}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      backgroundColor="rgba(0,0,0,0)"
      showAtmosphere={true}
      atmosphereColor="#4a90d9"
      atmosphereAltitude={0.15}
      enablePointerInteraction={false}
      animateIn={false}
      onGlobeReady={handleGlobeReady}
    />
  );
}
