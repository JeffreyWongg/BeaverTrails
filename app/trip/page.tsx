"use client";

import { useSurveyStore } from "../../lib/store";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Stop } from "../../types";

import { TripMap } from "./components/TripMap";
import { TripSidebar } from "./components/TripSidebar";
import { ImmersiveDrawer } from "./components/ImmersiveDrawer";
import { TripAssistant } from "./components/TripAssistant";

export default function TripPage() {
  const { itinerary } = useSurveyStore();
  const router = useRouter();

  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [routingMode, setRoutingMode] = useState<"straight" | "directions">("directions");

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
       {/* 70% Map Container */}
       <div className="w-[70%] h-full relative">
          <TripMap 
             onStopClick={setSelectedStop} 
             routingMode={routingMode} 
          />
          <ImmersiveDrawer 
             stop={selectedStop} 
             onClose={() => setSelectedStop(null)} 
          />
       </div>

       {/* 30% Sidebar */}
       <div className="w-[30%] h-full">
          <TripSidebar 
             routingMode={routingMode} 
             setRoutingMode={setRoutingMode}
             onStopClick={setSelectedStop}
          />
       </div>

       <TripAssistant />
    </div>
  );
}
