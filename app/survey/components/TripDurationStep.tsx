import { useSurveyStore } from "../../../lib/store";

export function TripDurationStep() {
  const { tripDuration, setField } = useSurveyStore();

  return (
    <div className="flex flex-col items-center max-w-lg mx-auto w-full">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4 text-center">
        How many days?
      </h2>

      <p className="text-gray-900 text-4xl font-bold mb-12">
        {tripDuration}
      </p>

      <div className="w-full relative px-4">
        <input
          type="range"
          min={2}
          max={21}
          value={tripDuration}
          onChange={(e) => setField("tripDuration", parseInt(e.target.value))}
          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#D97B4A]"
        />

        <div className="flex justify-between w-full text-gray-400 text-xs mt-4 px-1">
          <span>2</span>
          <span>11</span>
          <span>21</span>
        </div>
      </div>
    </div>
  );
}
