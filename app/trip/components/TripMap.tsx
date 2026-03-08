"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useSurveyStore } from "../../../lib/store";
import { Stop } from "../../../types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { checkStreetViewCoverage, getStopKey } from "../../../lib/streetView";

interface TripMapProps {
  onStopClick: (stop: Stop) => void;
  selectedStop: Stop | null;
  allStops: Stop[];
  onNavigate: (stop: Stop) => void;
}

export function TripMap({ onStopClick, selectedStop, allStops, onNavigate }: TripMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  // Store DOM elements by stop key so we can append badges later
  const markerElemsRef = useRef<Map<string, HTMLElement>>(new Map());
  const onStopClickRef = useRef(onStopClick);
  onStopClickRef.current = onStopClick;

  const { itinerary, streetViewCoverage, setField } = useSurveyStore();
  const [mapLoaded, setMapLoaded] = useState(false);

  const currentIndex = selectedStop
    ? allStops.findIndex(
        (s) =>
          s.name === selectedStop.name &&
          s.coordinates[0] === selectedStop.coordinates[0] &&
          s.coordinates[1] === selectedStop.coordinates[1]
      )
    : -1;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allStops.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) onNavigate(allStops[currentIndex - 1]);
  }, [hasPrev, currentIndex, allStops, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) onNavigate(allStops[currentIndex + 1]);
  }, [hasNext, currentIndex, allStops, onNavigate]);

  // Smooth fly to selected stop
  useEffect(() => {
    if (!mapRef.current || !selectedStop) return;
    const map = mapRef.current;

    const currentCenter = map.getCenter();
    const dx = selectedStop.coordinates[0] - currentCenter.lng;
    const dy = selectedStop.coordinates[1] - currentCenter.lat;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const bearing = Math.atan2(dx, dy) * (180 / Math.PI) * 0.12;

    map.flyTo({
      center: selectedStop.coordinates,
      zoom: dist > 2 ? 12 : 14.5,
      pitch: 50,
      bearing,
      duration: Math.min(Math.max(dist * 500, 1800), 4000),
      curve: 1.42,
      essential: true,
    });
  }, [selectedStop]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !itinerary || itinerary.length === 0) return;
    if (mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [-98.0, 60.0],
      zoom: 3,
      pitch: 0,
      antialias: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      setMapLoaded(true);

      setTimeout(() => {
        const firstCityCoords = itinerary[0].city_coordinates;
        if (firstCityCoords && firstCityCoords.length === 2) {
          map.flyTo({
            center: [firstCityCoords[0], firstCityCoords[1]],
            zoom: 10,
            pitch: 45,
            bearing: -15,
            duration: 3000,
            curve: 1.42,
            essential: true,
          });
        }
      }, 500);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [itinerary]);

  // Markers, route, and Street View badge checks
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !itinerary) return;
    const map = mapRef.current;

    const getEmoji = (type: string) => {
      switch (type) {
        case "park": return "🌲";
        case "restaurant": return "🍽️";
        case "hotel": return "🏨";
        case "attraction": return "📸";
        case "airport": return "✈️";
        default: return "📍";
      }
    };

    const addMarker = (
      stop: Stop,
      emoji: string,
      size: string,
      clickHandler?: () => void
    ) => {
      const el = document.createElement("div");
      el.className = "custom-marker cursor-pointer";
      el.style.lineHeight = "1";
      el.style.display = "inline-block";
      // Inner span handles hover scaling so Mapbox's transform on the outer div is never transitioned
      const inner = document.createElement("span");
      inner.className = `${size} inline-block transition-transform duration-200 hover:scale-125`;
      inner.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.4))";
      inner.textContent = emoji;
      el.appendChild(inner);
      if (clickHandler) el.addEventListener("click", clickHandler);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(stop.coordinates)
        .addTo(map);

      markersRef.current.push(marker);
      markerElemsRef.current.set(getStopKey(stop), el);
    };

    const updateMapData = () => {
      // Clean up previous markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      markerElemsRef.current.clear();

      const routeCoords: number[][] = [];

      itinerary.forEach((day) => {
        if (day.city_coordinates) {
          routeCoords.push(day.city_coordinates);
        }

        day.stops?.forEach((stop) => {
          if (stop.coordinates && stop.coordinates.length === 2) {
            addMarker(stop, getEmoji(stop.type), "text-2xl", () => {
              onStopClickRef.current(stop);
            });
          }
        });

        if (day.overnight_hotel_coordinates && day.overnight_hotel_coordinates.length === 2) {
          const hotelStop: Stop = {
            name: day.overnight_hotel,
            type: "hotel",
            coordinates: day.overnight_hotel_coordinates,
            description: `Your overnight stay in ${day.city}.`,
          };
          addMarker(hotelStop, "🛏️", "text-xl", () => {
            onStopClickRef.current(hotelStop);
          });
        }

        if (day.airport && day.airport.coordinates && day.airport.coordinates.length === 2) {
          const airportStop: Stop = {
            name: day.airport.name,
            type: "airport",
            coordinates: day.airport.coordinates,
            description: `Arrival airport for your flight into ${day.city}.`,
          };
          addMarker(airportStop, "✈️", "text-2xl", () => {
            onStopClickRef.current(airportStop);
          });
        }
      });

      // Clean up previous route layers
      try {
        if (map.getLayer("route-line")) map.removeLayer("route-line");
        if (map.getLayer("route-casing")) map.removeLayer("route-casing");
        if (map.getSource("route-source")) map.removeSource("route-source");
      } catch {
        // Layers may not exist yet
      }

      if (routeCoords.length >= 2) {
        map.addSource("route-source", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [{
              type: "Feature",
              geometry: { type: "LineString", coordinates: routeCoords },
              properties: {},
            }],
          },
        });

        map.addLayer({
          id: "route-casing",
          type: "line",
          source: "route-source",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#a0522d",
            "line-width": 6,
            "line-opacity": 0.25,
          },
        });

        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route-source",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#D97B4A",
            "line-width": 3,
            "line-opacity": 0.85,
            "line-dasharray": [2, 1.5],
          },
        });
      }

      // Run Street View checks in background after markers are placed
      runStreetViewChecks();
    };

    // Collect all activity stops for Street View checks
    const runStreetViewChecks = async () => {
      const stopsToCheck: Stop[] = [];
      itinerary.forEach((day) => {
        day.stops?.forEach((stop) => {
          if (stop.coordinates && stop.coordinates.length === 2) {
            stopsToCheck.push(stop);
          }
        });
      });

      const results = await Promise.all(
        stopsToCheck.map(async (stop) => {
          const [lng, lat] = stop.coordinates;
          const hasCoverage = await checkStreetViewCoverage(lat, lng);
          return { stop, hasCoverage };
        })
      );

      const coverageMap: Record<string, boolean> = { ...streetViewCoverage };
      results.forEach(({ stop, hasCoverage }) => {
        const key = getStopKey(stop);
        coverageMap[key] = hasCoverage;
        if (hasCoverage) {
          const el = markerElemsRef.current.get(key);
          if (el) {
            const badge = document.createElement("span");
            badge.textContent = "📷";
            badge.style.cssText =
              "position:absolute;top:-6px;right:-6px;font-size:10px;line-height:1;pointer-events:none;";
            el.appendChild(badge);
          }
        }
      });

      setField("streetViewCoverage", coverageMap);
    };

    if (map.isStyleLoaded()) {
      updateMapData();
    } else {
      map.once("style.load", updateMapData);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, itinerary]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "park": return "🌲 Park";
      case "restaurant": return "🍽️ Restaurant";
      case "hotel": return "🛏️ Hotel";
      case "attraction": return "📸 Attraction";
      case "airport": return "✈️ Airport";
      default: return "📍 Stop";
    }
  };

  return (
    <>
      <div ref={mapContainer} className="w-full h-full" />
      {selectedStop && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handlePrev}
            disabled={!hasPrev}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#D97B4A] hover:border-[#C89A7A]/50 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl px-5 py-3 flex flex-col items-center min-w-[200px] shadow-sm">
            <span className="text-[10px] uppercase tracking-[0.15em] font-medium text-[#D97B4A] mb-0.5">
              {getTypeLabel(selectedStop.type)}
            </span>
            <span className="text-sm font-semibold text-gray-900 text-center leading-tight">
              {selectedStop.name}
            </span>
            <span className="text-[10px] text-gray-400 mt-1">
              {currentIndex + 1} of {allStops.length}
            </span>
          </div>

          <button
            onClick={handleNext}
            disabled={!hasNext}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md border border-gray-200 flex items-center justify-center text-gray-500 hover:text-[#D97B4A] hover:border-[#C89A7A]/50 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </>
  );
}
