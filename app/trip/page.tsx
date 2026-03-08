"use client";

import { useSurveyStore } from "../../lib/store";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { Stop } from "../../types";
import { getStopKey } from "../../lib/streetView";
import { AnimatePresence } from "framer-motion";

import { TripMap } from "./components/TripMap";
import { TripSidebar } from "./components/TripSidebar";
import { ImmersiveDrawer } from "./components/ImmersiveDrawer";
import { ImmersiveView } from "./components/ImmersiveView";
import { TripAssistant } from "./components/TripAssistant";

export default function TripPage() {
  const { itinerary, immersiveConfig, narrationScripts, setField } = useSurveyStore();
  const router = useRouter();

  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);

  const allStops = useMemo(() => {
    if (!itinerary) return [];
    const stops: Stop[] = [];
    itinerary.forEach((day) => {
      if (day.airport && day.airport.coordinates?.length === 2) {
        stops.push({
          name: day.airport.name,
          type: "airport",
          coordinates: day.airport.coordinates,
          description: `Arrival airport for your flight into ${day.city}.`,
        });
      }
      (day.stops || []).forEach((s) => {
        if (s.coordinates?.length === 2) stops.push(s);
      });
      if (day.overnight_hotel && day.overnight_hotel_coordinates?.length === 2) {
        stops.push({
          name: day.overnight_hotel,
          type: "hotel",
          coordinates: day.overnight_hotel_coordinates,
          description: `Your overnight stay in ${day.city}.`,
        });
      }
    });
    return stops;
  }, [itinerary]);

  useEffect(() => {
    if (!itinerary || itinerary.length === 0) return;

    const stops = allStops.map((s) => ({
      key: getStopKey(s),
      name: s.name,
      type: s.type,
      notes: s.notes || s.description || "",
    }));

    fetch("/api/pregenerate-narrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stops, timeOfDay: "Day", season: "Summer" }),
    })
      .then((r) => r.json())
      .then(({ scripts }) => {
        if (scripts) setField("narrationScripts", { ...narrationScripts, ...scripts });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itinerary]);

  const handleEnterImmersive = (stop: Stop, time: string, season: string) => {
    setField("immersiveConfig", { stop, time, season });
  };

  const handleCloseImmersive = () => {
    setField("immersiveConfig", null);
  };

  if (!itinerary || itinerary.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF7F2] text-gray-900">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-3">No itinerary found</p>
        <h1 className="text-2xl font-medium text-gray-700 mb-6">Nothing to explore yet.</h1>
        <button
          onClick={() => router.push("/preferences")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#C89A7A] text-white text-sm font-medium hover:bg-[#B88A6A] transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const immersiveIndex =
    immersiveConfig && allStops.length > 0
      ? allStops.findIndex(
          (s) =>
            s.name === immersiveConfig.stop.name &&
            s.coordinates[0] === immersiveConfig.stop.coordinates[0] &&
            s.coordinates[1] === immersiveConfig.stop.coordinates[1]
        )
      : -1;

  return (
    <div className="w-full h-screen overflow-hidden flex bg-[#FAF7F2] text-gray-900">
      <div className="w-[70%] h-full relative">
        <TripMap
          onStopClick={setSelectedStop}
          selectedStop={selectedStop}
          allStops={allStops}
          onNavigate={setSelectedStop}
        />
        <ImmersiveDrawer
          stop={selectedStop}
          onClose={() => setSelectedStop(null)}
          onEnterImmersive={handleEnterImmersive}
        />
      </div>

      <div className="w-[30%] h-full">
        <TripSidebar onStopClick={setSelectedStop} />
      </div>

      <TripAssistant onEnterImmersive={handleEnterImmersive} />

      {/* Full-screen Immersive View */}
      <AnimatePresence>
        {immersiveConfig && (
          <ImmersiveView
            stop={immersiveConfig.stop}
            initialTime={immersiveConfig.time}
            initialSeason={immersiveConfig.season}
            stops={allStops}
            initialIndex={immersiveIndex >= 0 ? immersiveIndex : 0}
            onClose={handleCloseImmersive}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
