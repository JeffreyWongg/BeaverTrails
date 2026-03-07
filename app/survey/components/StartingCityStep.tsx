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
    // Debounce the mapbox search
    const delayDebounceFn = setTimeout(async () => {
      if (query.length > 2 && query !== startingCity?.name) {
        setIsLoading(true);
        // Only searching places in Canada (country=ca), requesting city types
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
      <div className="mb-6 p-4 bg-sky-500/10 rounded-full border border-sky-500/20">
         <MapPin size={48} className="text-sky-400" />
      </div>
      
      <h2 className="text-3xl font-bold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
        Where are you departing from?
      </h2>
      <p className="text-zinc-500 mb-8 text-center">Enter a Canadian city</p>

      <div className="relative w-full">
        <div className="relative flex items-center">
          <Search className="absolute left-4 text-zinc-400" size={20} />
          <input
            type="text"
            className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl py-4 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-lg"
            placeholder="e.g. Toronto, Vancouver, Montreal"
            value={query}
            onChange={(e) => {
               setQuery(e.target.value);
               if (startingCity && e.target.value !== startingCity.name) {
                 setField("startingCity", null); // Clear selection if edited
               }
            }}
            onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          />
          {isLoading && (
             <Loader2 className="absolute right-4 animate-spin text-sky-400" size={20} />
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <ul className="absolute z-50 w-full mt-2 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto">
            {suggestions.map((sugg) => (
              <li
                key={sugg.id}
                onClick={() => handleSelect(sugg)}
                className="px-4 py-3 hover:bg-sky-500/20 hover:text-sky-300 cursor-pointer text-zinc-300 transition-colors flex items-center gap-3 border-b border-zinc-700/50 last:border-0"
              >
                <MapPin size={16} className="text-zinc-500 flex-shrink-0" />
                <span className="truncate">{sugg.place_name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {startingCity && (
         <div className="mt-8 text-sky-400 font-medium animate-pulse flex items-center gap-2 bg-sky-500/10 px-4 py-2 rounded-full border border-sky-500/20">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            Starting from: {startingCity.name}
         </div>
      )}
    </div>
  );
}
