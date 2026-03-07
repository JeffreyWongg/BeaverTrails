"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useSurveyStore } from "../../../lib/store";
import { Stop } from "../../../types";

interface TripMapProps {
  onStopClick: (stop: Stop) => void;
  routingMode: "straight" | "directions";
}

export function TripMap({ onStopClick, routingMode }: TripMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { itinerary } = useSurveyStore();
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !itinerary || itinerary.length === 0) return;

    if (mapRef.current) return; // Initialize map only once

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [-98.0, 60.0], // Center of Canada roughly
      zoom: 3,
      pitch: 0,
    });

    mapRef.current = map;

    map.on("load", () => {
      setMapLoaded(true);

      // Add 3D Terrain
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

      // Fly to the first city after a short delay
      setTimeout(() => {
        const firstCityCoords = itinerary[0].city_coordinates;
        if (firstCityCoords && firstCityCoords.length === 2) {
          map.flyTo({
            center: [firstCityCoords[0], firstCityCoords[1]],
            zoom: 11,
            pitch: 60,
            bearing: -20,
            duration: 4000,
          });
        }
      }, 1000);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [itinerary]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !itinerary) return;
    const map = mapRef.current;

    // Helper to get emoji for stop type
    const getEmoji = (type: string) => {
      switch (type) {
        case "park":
          return "🌲";
        case "restaurant":
          return "🍽️";
        case "hotel":
          return "🏨";
        case "attraction":
          return "📸";
        default:
          return "📍";
      }
    };

    // Clean up existing markers
    const currentMarkers = document.querySelectorAll(".custom-marker");
    currentMarkers.forEach((m) => m.remove());

    const coordinatesList: number[][] = [];

    itinerary.forEach((day) => {
      if (day.city_coordinates) coordinatesList.push(day.city_coordinates);
      
      day.stops?.forEach((stop) => {
        if (stop.coordinates && stop.coordinates.length === 2) {
           coordinatesList.push(stop.coordinates);

           const el = document.createElement("div");
           el.className = "custom-marker text-3xl cursor-pointer hover:scale-125 transition-transform duration-200 drop-shadow-md";
           el.innerHTML = getEmoji(stop.type);
           
           el.addEventListener("click", () => {
             onStopClick(stop);
             map.flyTo({ center: stop.coordinates, zoom: 14, pitch: 45 });
           });

           new mapboxgl.Marker({ element: el })
             .setLngLat(stop.coordinates as [number, number])
             .addTo(map);
        }
      });
    });

    // Handle route line drawing
    const drawRoute = async () => {
       // Remove previous route if exists
       if (map.getLayer("route-line-animated")) map.removeLayer("route-line-animated");
       if (map.getSource("route-source")) map.removeSource("route-source");

       if (coordinatesList.length < 2) return;

       const geojson: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
         type: "FeatureCollection",
         features: [
           {
             type: "Feature",
             geometry: {
               type: "LineString",
               coordinates: coordinatesList,
             },
             properties: {}
           }
         ]
       };

       map.addSource("route-source", {
         type: "geojson",
         data: geojson,
       });

       map.addLayer({
         id: "route-line-animated",
         type: "line",
         source: "route-source",
         layout: {
           "line-join": "round",
           "line-cap": "round"
         },
         paint: {
           "line-color": "#10b981", // Emerald 500
           "line-width": 6,
           "line-dasharray": [0, 4, 3]
         }
       });

       // Dash animation loop
       let step = 0;
       const animateDashArray = () => {
         if (!map.getLayer("route-line-animated")) return;
         
         const newStep = parseInt(
            (step % 10).toString()
         );
         
         map.setPaintProperty("route-line-animated", "line-dasharray", [
            newStep,
            4,
            3,
         ]);
         
         step += 0.2;
         requestAnimationFrame(animateDashArray);
       };
       animateDashArray();
    };

    drawRoute();

  }, [mapLoaded, itinerary, routingMode, onStopClick]);

  return <div ref={mapContainer} className="w-full h-full relative" />;
}
