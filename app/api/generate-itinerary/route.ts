import { NextResponse } from "next/server";

// Allow up to 2 minutes on serverless platforms (Vercel, etc.)
export const maxDuration = 120;

const MODELS = [
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
];

const PER_MODEL_TIMEOUT = 30000; // 30s per model — but they race in parallel
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// --- Mapbox Geocoding ---
async function geocode(query: string, proximity?: string): Promise<[number, number] | null> {
  try {
    const params = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      limit: "1",
      country: "CA",
    });
    if (proximity) params.set("proximity", proximity);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const coords = data.features?.[0]?.center;
    return coords?.length === 2 ? (coords as [number, number]) : null;
  } catch {
    return null;
  }
}

function isNearby(coords: [number, number], ref: [number, number], maxKm = 150): boolean {
  const dLng = (coords[0] - ref[0]) * Math.cos((ref[1] * Math.PI) / 180) * 111;
  const dLat = (coords[1] - ref[1]) * 111;
  return Math.sqrt(dLng * dLng + dLat * dLat) < maxKm;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function geocodeItinerary(itinerary: any[]): Promise<any[]> {
  const cityResults = await Promise.all(
    itinerary.map((day) => geocode(`${day.city}, ${day.province}, Canada`))
  );
  for (let i = 0; i < itinerary.length; i++) {
    if (cityResults[i]) itinerary[i].city_coordinates = cityResults[i];
  }

  const tasks: Array<{
    callback: (coords: [number, number]) => void;
    query: string;
    proximity: string;
    cityCoords: [number, number] | null;
    maxKm: number;
    originalCoords: [number, number] | null;
  }> = [];

  for (const day of itinerary) {
    const cityCoords: [number, number] | null = day.city_coordinates || null;
    const cityProx = cityCoords ? `${cityCoords[0]},${cityCoords[1]}` : "";

    if (day.stops && Array.isArray(day.stops)) {
      for (const stop of day.stops) {
        tasks.push({
          query: `${stop.name}, ${day.city}, ${day.province}`,
          proximity: cityProx,
          cityCoords,
          maxKm: 100,
          originalCoords: Array.isArray(stop.coordinates) ? stop.coordinates : null,
          callback: (coords) => {
            stop.coordinates = coords;
          },
        });
      }
    }

    if (day.overnight_hotel) {
      tasks.push({
        query: `${day.overnight_hotel}, ${day.city}, ${day.province}`,
        proximity: cityProx,
        cityCoords,
        maxKm: 100,
        originalCoords: Array.isArray(day.overnight_hotel_coordinates)
          ? day.overnight_hotel_coordinates
          : null,
        callback: (coords) => {
          day.overnight_hotel_coordinates = coords;
        },
      });
    }

    if (day.airport?.name) {
      tasks.push({
        query: `${day.airport.name}, ${day.province}, Canada`,
        proximity: cityProx,
        cityCoords,
        maxKm: 200,
        originalCoords: Array.isArray(day.airport.coordinates) ? day.airport.coordinates : null,
        callback: (coords) => {
          day.airport.coordinates = coords;
        },
      });
    }
  }

  // Run ALL geocode calls in parallel (they're fast)
  const results = await Promise.all(
    tasks.map((t) => geocode(t.query, t.proximity || undefined))
  );
  for (let j = 0; j < tasks.length; j++) {
    const task = tasks[j];
    const coords = results[j];

    if (coords) {
      // If geocoded point is unreasonably far from the city, prefer original coords if we had them,
      // otherwise fall back to city centre.
      if (task.cityCoords && !isNearby(coords, task.cityCoords, task.maxKm)) {
        if (task.originalCoords) {
          task.callback(task.originalCoords);
        } else {
          task.callback(task.cityCoords);
        }
      } else {
        task.callback(coords);
      }
    } else if (task.originalCoords) {
      // Geocoding failed — keep whatever coordinates we already had instead of flattening to city centre.
      task.callback(task.originalCoords);
    } else if (task.cityCoords) {
      // Only if we had no original coords at all, fall back to city centre.
      task.callback(task.cityCoords);
    }
  }

  return itinerary;
}

async function callOpenRouter(apiKey: string, model: string, messages: Array<{ role: string; content: string }>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_MODEL_TIMEOUT);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://beavertrails.app",
        "X-Title": "BeaverTrails",
      },
      body: JSON.stringify({ model, messages, temperature: 0.5 }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`${model} error ${response.status}: ${errText.slice(0, 200)}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error(`No content from ${model}`);
    return content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`${model} timed out after ${PER_MODEL_TIMEOUT / 1000}s`);
    }
    throw err;
  }
}

export async function POST(req: Request) {
  try {
    const surveyData = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
    }

    const duration = surveyData.tripDuration || 7;
    const startCity = surveyData.startingCity?.name || "Toronto";
    const provinces = surveyData.recommendedProvinces?.join(", ") || "Ontario";

    const tiktokSummary =
      Array.isArray(surveyData.tiktokClips) && surveyData.tiktokClips.length
        ? `\n\nThe traveler also shared these TikTok travel clips. Treat them as high-priority anchors — include the exact places shown (or very close equivalents) as named stops on logical days, and mention in the descriptions that they came from the traveler's TikTok inspiration:\n${surveyData.tiktokClips
            .map(
              (c: { url?: string; caption?: string }, i: number) =>
                `${i + 1}. ${c.caption || "Unknown spot"} — ${c.url || "no URL"}`
            )
            .join("\n")}\n`
        : "";

    const prompt = `${duration}-day Canada trip from ${startCity} through ${provinces}. ${surveyData.travellerArchetype}, likes ${
      surveyData.activities?.join(", ") || "sightseeing"
    }.${surveyData.dreamTrip ? ` "${surveyData.dreamTrip}"` : ""} Budget: ${surveyData.budgetPerPerson}.

CRITICAL: Every single place the traveler will go must be its own stop in the "stops" array, in chronological order. Each stop is a node with a mini description below. You MUST include:

- Airport: On flight days, include the arrival/departure airport as a stop (type: "airport") with a 1–2 sentence description (e.g. land, clear customs, pick up bags).
- Transit: When using bus/train, include each station as a stop (type: "transit") with a short description (e.g. "Union Station — GO Transit hub; catch UP Express to Pearson").
- Restaurants & cafés: Every meal spot as its own stop (type: "restaurant") with name and a short description (what to order, vibe, opening note).
- Landmarks & parks: Each attraction or park as a stop (type: "attraction" or "park") with a mini description.
- Hotel: The overnight stay as a stop (type: "hotel") with a short description (check-in, vibe, one tip).

Use only these stop types: "airport", "transit", "restaurant", "hotel", "attraction", "park", "other". Every stop MUST have: "name", "type", "description" (1–2 sentences), and "coordinates" (use city centre if you don't know exact; we geocode). In each description you may include time-of-day hints (e.g. "08:00 – Land at YYZ", "12:30 – Lunch here") so the day reads as a full schedule.

Focus on hidden gems and local favorites. Drive when possible, fly only if 1000+ km. On flight days the first stop must be the airport; the last stop of each day should usually be the hotel.

${tiktokSummary}

Day schema (every place = one stop): {"date_offset":1,"city":"Toronto","city_coordinates":[-79.38,43.65],"province":"Ontario","stops":[{"name":"Toronto Pearson International","type":"airport","coordinates":[-79.63,43.68],"description":"Land at YYZ, clear customs, pick up bags. Allow ~1h to downtown."},{"name":"Union Station","type":"transit","coordinates":[-79.38,43.64],"description":"GO Transit and VIA Rail hub. UP Express to Pearson or trains to Niagara."},{"name":"St. Lawrence Market","type":"restaurant","coordinates":[-79.37,43.65],"description":"Peameal bacon sandwich for lunch. Historic market, Tue–Sat."},{"name":"Graffiti Alley","type":"attraction","coordinates":[-79.4,43.65],"description":"10:00 – Street art and murals in the Fashion District; great for photos."},{"name":"The Drake Hotel","type":"hotel","coordinates":[-79.42,43.64],"description":"Check in here. Queen West vibe, rooftop bar."}],"overnight_hotel":"The Drake Hotel","overnight_hotel_coordinates":[-79.42,43.64],"travel_time_from_prev_hours":0,"travel_method_from_prev":"none"}

JSON array only.`;

    const messages = [
      { role: "system", content: "You are a Canadian travel planning API. Respond with only a raw JSON array — no markdown, no explanation." },
      { role: "user", content: prompt },
    ];

    // Race ALL models in parallel — first valid response wins
    console.log(`[generate-itinerary] Racing ${MODELS.length} models in parallel...`);

    const raceAttempts = MODELS.map(async (model) => {
      try {
        console.log(`[generate-itinerary] Starting ${model}...`);
        const content = await callOpenRouter(apiKey, model, messages);
        const parsed = JSON.parse(content);
        const itinerary = Array.isArray(parsed) ? parsed : parsed.itinerary || parsed.days || parsed;
        if (!Array.isArray(itinerary) || itinerary.length === 0) {
          throw new Error(`${model} returned empty/invalid itinerary`);
        }
        console.log(`[generate-itinerary] ✓ ${model} won the race (${itinerary.length} days)`);
        return itinerary;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[generate-itinerary] ✗ ${model}: ${msg.slice(0, 120)}`);
        throw err;
      }
    });

    let itinerary;
    try {
      itinerary = await Promise.any(raceAttempts);
    } catch {
      throw new Error("All models failed or timed out. Please try again.");
    }

    // Fix coordinates with real geocoding
    console.log(`[generate-itinerary] Geocoding all locations...`);
    itinerary = await geocodeItinerary(itinerary);

    // Derive day.airport and day.overnight_hotel from stops so map/PDF still work
    for (const day of itinerary) {
      const stops = day.stops || [];
      const airportStop = stops.find((s: { type?: string }) => s.type === "airport");
      const hotelStop = stops.find((s: { type?: string }) => s.type === "hotel");
      if (airportStop && airportStop.coordinates?.length === 2) {
        day.airport = { name: airportStop.name, coordinates: airportStop.coordinates };
      }
      if (hotelStop && hotelStop.coordinates?.length === 2) {
        day.overnight_hotel = hotelStop.name;
        day.overnight_hotel_coordinates = hotelStop.coordinates;
      }
    }

    console.log(`[generate-itinerary] ✓ Done`);

    return NextResponse.json(itinerary);

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error generating itinerary:", errMsg);
    return NextResponse.json(
      { error: "Failed to generate itinerary", detail: errMsg },
      { status: 500 }
    );
  }
}
