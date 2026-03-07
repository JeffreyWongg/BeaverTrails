import { useSurveyStore } from "../../../lib/store";
import { CalendarRange } from "lucide-react";

export function TripDurationStep() {
  const { tripDuration, setField } = useSurveyStore();

  return (
    <div className="flex flex-col items-center max-w-lg mx-auto w-full">
      <div className="mb-6 p-4 bg-zinc-800 rounded-xl border border-zinc-700">
         <CalendarRange size={48} className="text-canada-red-light" />
      </div>

      <h2 className="text-3xl font-bold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
        How many days are you traveling?
      </h2>

      <p className="text-white font-bold text-2xl mb-12">
        {tripDuration} {tripDuration === 1 ? 'Day' : 'Days'}
      </p>

      <div className="w-full relative px-4">
        <input
          type="range"
          min={2}
          max={21}
          value={tripDuration}
          onChange={(e) => setField("tripDuration", parseInt(e.target.value))}
          className="w-full h-[2px] bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#C8102E]"
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
