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

// Route waypoints — looping journey across Canada
const ROUTE = [
  { name: "Toronto", lat: 43.6532, lng: -79.3832 },
  { name: "Ottawa", lat: 45.4247, lng: -75.695 },
  { name: "Montreal", lat: 45.5017, lng: -73.5673 },
  { name: "Vancouver", lat: 49.2827, lng: -123.1207 },
  { name: "Calgary", lat: 51.0447, lng: -114.0719 },
  { name: "Winnipeg", lat: 49.8951, lng: -97.1384 },
];

interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

export default function GlobeComponent({ width = 800, height = 800 }: GlobeComponentProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [canadaFeatures, setCanadaFeatures] = useState<Feature<Geometry>[]>([]);
  const [arcsData, setArcsData] = useState<ArcData[]>([]);
  const [currentRing, setCurrentRing] = useState<{ lat: number; lng: number; maxR: number; propagationSpeed: number; repeatPeriod: number } | null>(null);
  const [isGlobeReady, setIsGlobeReady] = useState(false);
  const routeIndexRef = useRef(0);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Preload texture image immediately
  useEffect(() => {
    const img = new Image();
    img.src = "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
  }, []);

  // Fetch TopoJSON and extract Canada polygon - start immediately
  useEffect(() => {
    // Use AbortController for cleanup if component unmounts
    const controller = new AbortController();
    
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json", {
      signal: controller.signal,
      cache: "force-cache", // Use browser cache if available
    })
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
        if (err.name !== "AbortError") {
          console.error("[Globe] Failed to load country data:", err);
        }
      });

    return () => controller.abort();
  }, []);

  // Configure globe once ready
  const handleGlobeReady = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;

    setIsGlobeReady(true);

    // Start at first city (Toronto)
    const startCity = ROUTE[0];
    globe.pointOfView({ lat: startCity.lat, lng: startCity.lng, altitude: 2.0 }, 0);

    // Set initial ring at first city
    setCurrentRing({
      lat: startCity.lat,
      lng: startCity.lng,
      maxR: 4,
      propagationSpeed: 2,
      repeatPeriod: 1400,
    });

    // Disable zoom so mouse-wheel scrolls the page instead of zooming the globe
    try {
      const controls = globe.controls();
      controls.enableZoom = false;
    } catch {
      // non-critical
    }

    // Soften lighting — desaturated, moody look that blends with dark background
    try {
      const scene = globe.scene();
      if (scene) {
        scene.children.forEach((child: { type?: string; intensity?: number }) => {
          if (child.type === "DirectionalLight" && child.intensity !== undefined) {
            child.intensity = 0.6;
          }
          if (child.type === "AmbientLight" && child.intensity !== undefined) {
            child.intensity = 0.35;
          }
        });
      }
    } catch {
      // non-critical
    }
  }, []);

  // Route animation loop
  useEffect(() => {
    if (!isGlobeReady) return;

    const globe = globeRef.current;
    if (!globe) return;

    const animateRoute = () => {
      const currentIndex = routeIndexRef.current;
      const currentCity = ROUTE[currentIndex];
      const nextIndex = (currentIndex + 1) % ROUTE.length;
      const nextCity = ROUTE[nextIndex];

      // Always replace with a single arc (never accumulate)
      setArcsData(() => [
        {
          startLat: currentCity.lat,
          startLng: currentCity.lng,
          endLat: nextCity.lat,
          endLng: nextCity.lng,
        },
      ]);

      // Update ring to next destination
      setCurrentRing({
        lat: nextCity.lat,
        lng: nextCity.lng,
        maxR: 4,
        propagationSpeed: 2,
        repeatPeriod: 1400,
      });

      // Pan camera to next city (3000ms transition)
      globe.pointOfView({ lat: nextCity.lat, lng: nextCity.lng, altitude: 2.0 }, 3000);

      // Move to next city after transition completes
      animationTimerRef.current = setTimeout(() => {
        routeIndexRef.current = nextIndex;

        // Clear the arc when we reach the destination
        setArcsData(() => []);

        // Small delay before starting next leg to ensure arc is cleared
        setTimeout(() => {
          animateRoute();
        }, 100);
      }, 3500); // 3000ms transition + 500ms dwell
    };

    // Start animation after a brief delay to let globe initialize
    const startTimer = setTimeout(() => {
      animateRoute();
    }, 1000);

    return () => {
      if (startTimer) clearTimeout(startTimer);
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, [isGlobeReady]);

  return (
    <GlobeGL
      ref={globeRef}
      width={width}
      height={height}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      backgroundColor="rgba(0,0,0,0)"
      showAtmosphere={true}
      atmosphereColor="#3a6a9a"
      atmosphereAltitude={0.1}
      // Canada highlight
      polygonsData={canadaFeatures}
      polygonAltitude={0.006}
      polygonCapColor={() => "rgba(255, 255, 255, 0.08)"}
      polygonSideColor={() => "rgba(180, 220, 255, 0.05)"}
      polygonStrokeColor={() => "rgba(180, 220, 255, 0.25)"}
      polygonLabel={() => ""}
      // Arcs between cities
      arcsData={arcsData}
      arcStartLat="startLat"
      arcStartLng="startLng"
      arcEndLat="endLat"
      arcEndLng="endLng"
      arcColor={() => "rgba(110, 200, 170, 0.6)"}
      arcDashLength={0.4}
      arcDashGap={0.2}
      arcDashAnimateTime={2000}
      // Pulsing ring at current destination (rendered on top)
      ringsData={currentRing ? [currentRing] : []}
      ringLat="lat"
      ringLng="lng"
      ringColor={() => "rgba(110, 200, 170, 0.4)"}
      ringMaxRadius="maxR"
      ringPropagationSpeed="propagationSpeed"
      ringRepeatPeriod="repeatPeriod"
      ringAltitude={0.02}
      // Interaction
      enablePointerInteraction={true}
      animateIn={false}
      onGlobeReady={handleGlobeReady}
    />
  );
}
