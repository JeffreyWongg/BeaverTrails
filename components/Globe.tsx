"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import GlobeGL from "react-globe.gl";
import type { GlobeMethods } from "react-globe.gl";
import { feature } from "topojson-client";
import type { Topology, Objects } from "topojson-specification";
import type { FeatureCollection, Feature, Geometry } from "geojson";

interface GlobeComponentProps {
  width?: number;
  height?: number;
}

// Pulsing ring markers — Ottawa & Toronto
const CANADIAN_RINGS = [
  { lat: 45.4247, lng: -75.695, maxR: 3, propagationSpeed: 1.5, repeatPeriod: 1200 },
  { lat: 43.6532, lng: -79.3832, maxR: 4, propagationSpeed: 2, repeatPeriod: 1400 },
];

export default function GlobeComponent({ width = 800, height = 800 }: GlobeComponentProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [canadaFeatures, setCanadaFeatures] = useState<Feature<Geometry>[]>([]);

  // Fetch TopoJSON and extract Canada polygon
  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((topology: Topology<Objects<Record<string, unknown>>>) => {
        const geojson = feature(topology, topology.objects.countries) as FeatureCollection;
        const canada = geojson.features.find(
          (f) => f.id === "124" || (f.properties && f.properties.name === "Canada")
        );
        if (canada) {
          setCanadaFeatures([canada]);
        } else {
          console.warn("[Globe] Canada not found in TopoJSON data");
        }
      })
      .catch((err: Error) => {
        console.error("[Globe] Failed to load country data:", err);
      });
  }, []);

  // Configure globe once ready
  const handleGlobeReady = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;

    // Camera focused on Canada
    globe.pointOfView({ lat: 56, lng: -106, altitude: 2.0 }, 0);

    // Auto-rotation via OrbitControls
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;

    // Adjust lighting — let the texture show its natural colors
    try {
      const scene = globe.scene();
      if (scene) {
        scene.children.forEach((child: { type?: string; intensity?: number }) => {
          if (child.type === "DirectionalLight" && child.intensity !== undefined) {
            child.intensity = 1.2;
          }
          if (child.type === "AmbientLight" && child.intensity !== undefined) {
            child.intensity = 0.6;
          }
        });
      }
    } catch {
      // non-critical
    }
  }, []);

  return (
    <GlobeGL
      ref={globeRef}
      width={width}
      height={height}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      backgroundColor="rgba(0,0,0,0)"
      showAtmosphere={true}
      atmosphereColor="#4a90d9"
      atmosphereAltitude={0.12}
      // Canada highlight
      polygonsData={canadaFeatures}
      polygonAltitude={0.006}
      polygonCapColor={() => "rgba(255, 255, 255, 0.08)"}
      polygonSideColor={() => "rgba(180, 220, 255, 0.05)"}
      polygonStrokeColor={() => "rgba(180, 220, 255, 0.25)"}
      polygonLabel={() => ""}
      // Pulsing rings
      ringsData={CANADIAN_RINGS}
      ringLat="lat"
      ringLng="lng"
      ringColor={() => "rgba(110, 200, 170, 0.4)"}
      ringMaxRadius="maxR"
      ringPropagationSpeed="propagationSpeed"
      ringRepeatPeriod="repeatPeriod"
      // Interaction
      enablePointerInteraction={true}
      animateIn={false}
      onGlobeReady={handleGlobeReady}
    />
  );
}
