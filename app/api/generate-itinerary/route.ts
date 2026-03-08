import { NextResponse } from "next/server";

// Allow up to 2 minutes on serverless platforms (Vercel, etc.)
export const maxDuration = 120;

const MODELS = [
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
  "google/gemini-2.0-flash-exp:free", // Free fallback
  "meta-llama/llama-3.2-3b-instruct:free", // Free fallback
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
          callback: (coords) => { stop.coordinates = coords; },
        });
      }
    }

    if (day.overnight_hotel) {
      tasks.push({
        query: `${day.overnight_hotel}, ${day.city}, ${day.province}`,
        proximity: cityProx,
        cityCoords,
        maxKm: 100,
        callback: (coords) => { day.overnight_hotel_coordinates = coords; },
      });
    }

    if (day.airport?.name) {
      tasks.push({
        query: `${day.airport.name}, ${day.province}, Canada`,
        proximity: cityProx,
        cityCoords,
        maxKm: 200,
        callback: (coords) => { day.airport.coordinates = coords; },
      });
    }
  }

  // Run ALL geocode calls in parallel (they're fast)
  const results = await Promise.all(
    tasks.map((t) => geocode(t.query, t.proximity || undefined))
  );
  for (let j = 0; j < tasks.length; j++) {
    const coords = results[j];
    if (coords) {
      if (tasks[j].cityCoords && !isNearby(coords, tasks[j].cityCoords!, tasks[j].maxKm)) {
        tasks[j].callback(tasks[j].cityCoords!);
      } else {
        tasks[j].callback(coords);
      }
    } else if (tasks[j].cityCoords) {
      tasks[j].callback(tasks[j].cityCoords!);
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

    const tiktokSection =
      Array.isArray(surveyData.tiktokClips) && surveyData.tiktokClips.length
        ? `\n\n⚠️ TIKTOK FOCAL POINTS — These are non-negotiable. The entire trip must be structured around visiting these locations:\n${surveyData.tiktokClips
            .map((c: { url?: string; caption?: string; summary?: string }, i: number) => {
              const desc = c.summary || c.caption || "Unknown location";
              return `${i + 1}. ${desc}${c.url ? ` (source: ${c.url})` : ""}
   → Dedicate at least a half-day to this location
   → Add 2–3 complementary nearby stops (local cafes, scenic viewpoints, hidden gems) that pair naturally with this spot
   → Mention in the stop description that it was inspired by the traveler's TikTok`;
            })
            .join("\n")}\n\nAll other stops should geographically orbit around these focal points.\n`
        : "";

    const prompt = `${duration}-day Canada trip from ${startCity} through ${provinces}. ${surveyData.travellerArchetype}, likes ${
      surveyData.activities?.join(", ") || "sightseeing"
    }.${surveyData.dreamTrip ? ` "${surveyData.dreamTrip}"` : ""} Budget: ${surveyData.budgetPerPerson}.

Focus on hidden gems and local favorites over tourist traps. Drive when possible, fly only if 1000+km. Each stop needs a short "description". On flight days, include airport as a stop.

Plan each day as a fully scheduled timeline: in each stop's "description", include clear time-of-day hints (e.g. "08:00 - Land at YYZ and clear customs", "12:30 - Lunch at a nearby café", "18:00 - Sunset at the viewpoint, then walk back to the hotel"). Cover morning, afternoon, and evening with at least 3–5 distinct moments including: intercity travel (flight/train/drive times), hotel check-in/out, at least 2 meal suggestions, and 1–3 key landmarks or experiences.

${tiktokSection}

Day schema: {"date_offset":1,"city":"Toronto","city_coordinates":[-79.38,43.65],"province":"Ontario","stops":[{"name":"Graffiti Alley","type":"other","coordinates":[-79.4,43.65],"description":"08:30 - Coffee on Queen Street West.\n10:00 - Stroll through Graffiti Alley for photos of the murals.\n12:30 - Lunch nearby on a patio."}],"overnight_hotel":"The Drake","overnight_hotel_coordinates":[-79.42,43.64],"travel_time_from_prev_hours":0,"travel_method_from_prev":"none"}

JSON array only.`;

    const messages = [
      { role: "system", content: "You are a Canadian travel planning API. When TikTok focal points are provided, they are the MANDATORY centerpiece of the itinerary — non-negotiable stops. Respond with only a raw JSON array — no markdown, no explanation." },
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
