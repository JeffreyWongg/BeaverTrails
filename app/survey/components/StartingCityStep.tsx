import { useState, useEffect } from "react";
import { useSurveyStore } from "../../../lib/store";
import { MapPin, Search, Loader2 } from "lucide-react";

interface Suggestion {
  id: string;
  place_name: string;
  center: [number, number];
}

export function StartingCityStep() {
  const { startingCity, setField } = useSurveyStore();
  const [query, setQuery] = useState(startingCity?.name || "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length > 2 && query !== startingCity?.name) {
        setIsLoading(true);
        const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!MAPBOX_TOKEN) {
           console.error("Mapbox token missing");
           setIsLoading(false);
           return;
        }

        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=ca&types=place&access_token=${MAPBOX_TOKEN}`
          );
          const data = await res.json();
          setSuggestions(data.features || []);
          setShowDropdown(true);
        } catch (error) {
          console.error("Error fetching geocoding data", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, startingCity?.name]);

  const handleSelect = (sugg: Suggestion) => {
    setQuery(sugg.place_name);
    setField("startingCity", { name: sugg.place_name, coordinates: sugg.center });
    setShowDropdown(false);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto">
      <h2 className="text-2xl font-semibold text-white mb-2 text-center">
        Where are you departing from?
      </h2>
      <p className="text-zinc-500 mb-8 text-center text-sm">Enter a Canadian city</p>

      <div className="relative w-full">
        <div className="relative flex items-center">
          <Search className="absolute left-4 text-zinc-500" size={18} />
          <input
            type="text"
            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl py-3.5 pl-11 pr-11 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-zinc-600 transition-all"
            placeholder="e.g. Toronto, Vancouver, Montreal"
            value={query}
            onChange={(e) => {
               setQuery(e.target.value);
               if (startingCity && e.target.value !== startingCity.name) {
                 setField("startingCity", null);
               }
            }}
            onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
            onBlur={() => setShowDropdown(false)}
          />
          {isLoading && (
             <Loader2 className="absolute right-4 animate-spin text-zinc-400" size={18} />
          )}
        </div>

        {showDropdown && suggestions.length > 0 && (
          <ul className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto">
            {suggestions.map((sugg) => (
              <li
                key={sugg.id}
                onMouseDown={(e) => {
                   e.preventDefault();
                   handleSelect(sugg);
                }}
                className="px-4 py-3 hover:bg-white/5 cursor-pointer text-zinc-300 hover:text-white transition-colors flex items-center gap-3 border-b border-zinc-800/50 last:border-0"
              >
                <MapPin size={14} className="text-zinc-500 flex-shrink-0" />
                <span className="truncate">{sugg.place_name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {startingCity && (
         <div className="mt-6 text-white text-sm font-medium flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-zinc-800">
            <MapPin size={14} className="text-zinc-400" />
            {startingCity.name}
         </div>
      )}
    </div>
  );
}
