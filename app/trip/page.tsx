"use client";

import { useSurveyStore } from "../../lib/store";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Stop } from "../../types";
import { AnimatePresence } from "framer-motion";

import { TripMap } from "./components/TripMap";
import { TripSidebar } from "./components/TripSidebar";
import { ImmersiveDrawer } from "./components/ImmersiveDrawer";
import { ImmersiveView } from "./components/ImmersiveView";
import { TripAssistant } from "./components/TripAssistant";

export default function TripPage() {
  const { itinerary, immersiveConfig, setField } = useSurveyStore();
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

  const handleEnterImmersive = (stop: Stop, time: string, season: string) => {
    setField("immersiveConfig", { stop, time, season });
  };

  const handleCloseImmersive = () => {
    setField("immersiveConfig", null);
  };

  if (!itinerary || itinerary.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white">
        <h1 className="text-2xl text-zinc-400 mb-4">No itinerary generated.</h1>
        <button
          onClick={() => router.push("/preferences")}
          className="text-emerald-400 underline"
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
    <div className="w-full h-screen overflow-hidden flex bg-zinc-950 text-white">
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
