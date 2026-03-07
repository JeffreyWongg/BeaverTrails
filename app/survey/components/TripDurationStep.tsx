import { useSurveyStore } from "../../../lib/store";
import { CalendarRange } from "lucide-react";

export function TripDurationStep() {
  const { tripDuration, setField } = useSurveyStore();

  return (
    <div className="flex flex-col items-center max-w-lg mx-auto w-full">
      <div className="mb-6 p-4 bg-indigo-500/10 rounded-full border border-indigo-500/20">
         <CalendarRange size={48} className="text-indigo-400" />
      </div>
      
      <h2 className="text-3xl font-bold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
        How many days are you traveling?
      </h2>
      
      <p className="text-indigo-300 font-medium text-xl mb-12">
        {tripDuration} {tripDuration === 1 ? 'Day' : 'Days'}
      </p>

      <div className="w-full relative px-4">
        <input
          type="range"
          min={2}
          max={21}
          value={tripDuration}
          onChange={(e) => setField("tripDuration", parseInt(e.target.value))}
          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        
        <div className="flex justify-between w-full text-zinc-500 text-sm mt-4 px-1 font-medium">
          <span>2 Days</span>
          <span>11 Days</span>
          <span>21 Days</span>
        </div>
      </div>
    </div>
  );
}
