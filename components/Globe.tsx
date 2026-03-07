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

// Canadian cities for pulsing ring markers
const CANADIAN_RINGS = [
  { lat: 45.4247, lng: -75.695, maxR: 6, propagationSpeed: 1.5, repeatPeriod: 1200 },  // Ottawa
  { lat: 43.6532, lng: -79.3832, maxR: 8, propagationSpeed: 2, repeatPeriod: 1400 },    // Toronto
  { lat: 49.2827, lng: -123.1207, maxR: 7, propagationSpeed: 1.8, repeatPeriod: 1300 }, // Vancouver
  { lat: 51.0447, lng: -114.0719, maxR: 5, propagationSpeed: 1.5, repeatPeriod: 1100 }, // Calgary
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
        // Canada = ISO 3166-1 numeric "124", property name (lowercase) = "Canada"
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

    // Set camera to focus on Canada
    globe.pointOfView({ lat: 56, lng: -106, altitude: 2.0 }, 0);

    // Brighten globe material for visibility while keeping cinematic feel
    try {
      const globeAny = globe as unknown as Record<string, () => Record<string, unknown>>;
      if (typeof globeAny.globeMaterial === "function") {
        const mat = globeAny.globeMaterial() as {
          color: { set: (c: string) => void };
          emissive: { set: (c: string) => void };
          emissiveIntensity: number;
          shininess: number;
        };
        mat.color.set("#4a7a9b");
        mat.emissive.set("#1a3a5a");
        mat.emissiveIntensity = 0.6;
        mat.shininess = 15;
      }
    } catch {
      console.warn("[Globe] Could not customize globe material");
    }

    // Keep lights reasonably bright
    try {
      const scene = globe.scene();
      if (scene) {
        scene.children.forEach((child: { type?: string; intensity?: number }) => {
          if (child.type === "DirectionalLight" && child.intensity !== undefined) {
            child.intensity = 1.2;
          }
          if (child.type === "AmbientLight" && child.intensity !== undefined) {
            child.intensity = 0.8;
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
      // Globe appearance
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
      backgroundColor="rgba(0,0,0,0)"
      showAtmosphere={true}
      atmosphereColor="#3a9ad9"
      atmosphereAltitude={0.15}
      // Canada polygon highlight
      polygonsData={canadaFeatures}
      polygonAltitude={0.012}
      polygonCapColor={() => "rgba(80, 200, 240, 0.35)"}
      polygonSideColor={() => "rgba(80, 200, 240, 0.2)"}
      polygonStrokeColor={() => "rgba(120, 220, 255, 0.8)"}
      polygonLabel={() => ""}
      // Pulsing rings on Canadian cities
      ringsData={CANADIAN_RINGS}
      ringLat="lat"
      ringLng="lng"
      ringColor={() => "rgba(64, 180, 220, 0.6)"}
      ringMaxRadius="maxR"
      ringPropagationSpeed="propagationSpeed"
      ringRepeatPeriod="repeatPeriod"
      // Interaction & rotation
      enablePointerInteraction={true}
      autoRotate={true}
      autoRotateSpeed={0.4}
      animateIn={false}
      onGlobeReady={handleGlobeReady}
    />
  );
}
