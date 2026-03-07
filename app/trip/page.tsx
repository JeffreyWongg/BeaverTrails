"use client";

import { useSurveyStore } from "../../lib/store";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { Stop } from "../../types";

import { TripMap } from "./components/TripMap";
import { TripSidebar } from "./components/TripSidebar";
import { ImmersiveDrawer } from "./components/ImmersiveDrawer";
import { TripAssistant } from "./components/TripAssistant";

export default function TripPage() {
  const { itinerary } = useSurveyStore();
  const router = useRouter();

  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);

  const allStops = useMemo(() => {
    if (!itinerary) return [];
    const stops: Stop[] = [];
    itinerary.forEach((day) => {
      // Airport (arrival) at the start of the day if it was a flight
      if (day.airport && day.airport.coordinates?.length === 2) {
        stops.push({
          name: day.airport.name,
          type: "airport",
          coordinates: day.airport.coordinates,
          description: `Arrival airport for your flight into ${day.city}.`,
        });
      }
      // Regular stops (already have descriptions from AI)
      (day.stops || []).forEach((s) => {
        if (s.coordinates?.length === 2) stops.push(s);
      });
      // Hotel at the end of the day
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

  if (!itinerary || itinerary.length === 0) {
     return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white">
            <h1 className="text-2xl text-zinc-400 mb-4">No itinerary generated.</h1>
            <button onClick={() => router.push('/preferences')} className="text-emerald-400 underline">
               Go Back
            </button>
        </div>
     );
  }

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
          />
       </div>

       <div className="w-[30%] h-full">
          <TripSidebar 
             onStopClick={setSelectedStop}
          />
       </div>

       <TripAssistant />
    </div>
  );
}
