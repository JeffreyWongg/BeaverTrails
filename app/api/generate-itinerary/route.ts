import { NextResponse } from "next/server";

const MODELS = [
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "stepfun/step-3.5-flash:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "arcee-ai/trinity-large-preview:free",
];

const TIMEOUT_MS = 45000;
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

// Check if coords are within ~150km of a reference point
function isNearby(coords: [number, number], ref: [number, number], maxKm = 150): boolean {
  const dLng = (coords[0] - ref[0]) * Math.cos((ref[1] * Math.PI) / 180) * 111;
  const dLat = (coords[1] - ref[1]) * 111;
  return Math.sqrt(dLng * dLng + dLat * dLat) < maxKm;
}

// --- Fix all coordinates using real geocoding ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function geocodeItinerary(itinerary: any[]): Promise<any[]> {
  // Step 1: Geocode all cities first — include province for accuracy
  const cityResults = await Promise.all(
    itinerary.map((day) => geocode(`${day.city}, ${day.province}, Canada`))
  );
  for (let i = 0; i < itinerary.length; i++) {
    if (cityResults[i]) itinerary[i].city_coordinates = cityResults[i];
  }

  // Step 2: Geocode stops, hotels, airports — always include city + province
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

    // Stops — query includes stop name + city + province
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

    // Hotel — query includes hotel name + city + province
    if (day.overnight_hotel) {
      tasks.push({
        query: `${day.overnight_hotel}, ${day.city}, ${day.province}`,
        proximity: cityProx,
        cityCoords,
        maxKm: 100,
        callback: (coords) => { day.overnight_hotel_coordinates = coords; },
      });
    }

    // Airport — query includes province, wider radius allowed
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

  // Run in batches of 10
  const BATCH = 10;
  for (let i = 0; i < tasks.length; i += BATCH) {
    const batch = tasks.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map((t) => geocode(t.query, t.proximity || undefined))
    );
    for (let j = 0; j < batch.length; j++) {
      const coords = results[j];
      if (coords) {
        // Validate: if the result is way too far from the city, snap to city center instead
        if (batch[j].cityCoords && !isNearby(coords, batch[j].cityCoords!, batch[j].maxKm)) {
          console.warn(`[geocode] "${batch[j].query}" returned coords too far from ${batch[j].cityCoords}, using city center`);
          batch[j].callback(batch[j].cityCoords!);
        } else {
          batch[j].callback(coords);
        }
      } else if (batch[j].cityCoords) {
        // Geocoding failed entirely — fall back to city center
        batch[j].callback(batch[j].cityCoords!);
      }
    }
  }

  return itinerary;
}

async function callOpenRouter(apiKey: string, model: string, messages: Array<{ role: string; content: string }>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

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
      throw new Error(`${model} timed out after ${TIMEOUT_MS / 1000}s`);
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

    const prompt = `${duration}-day Canada trip from ${startCity} through ${provinces}. ${surveyData.travellerArchetype}, likes ${surveyData.activities?.join(", ") || "sightseeing"}.${surveyData.dreamTrip ? ` "${surveyData.dreamTrip}"` : ""} Budget: ${surveyData.budgetPerPerson}.

Focus on hidden gems and local favorites over tourist traps. Drive when possible, fly only if 1000+km. Each stop needs a short "description". On flight days, include airport as a stop.

Day schema: {"date_offset":1,"city":"Toronto","city_coordinates":[-79.38,43.65],"province":"Ontario","stops":[{"name":"Graffiti Alley","type":"other","coordinates":[-79.4,43.65],"description":"Vibrant street art hidden in the Fashion District."}],"overnight_hotel":"The Drake","overnight_hotel_coordinates":[-79.42,43.64],"travel_time_from_prev_hours":0,"travel_method_from_prev":"none"}

JSON array only.`;

    const messages = [
      { role: "system", content: "You are a Canadian travel planning API. Respond with only a raw JSON array — no markdown, no explanation." },
      { role: "user", content: prompt },
    ];

    let lastError = "";
    for (const model of MODELS) {
      try {
        console.log(`[generate-itinerary] Trying ${model}...`);
        const content = await callOpenRouter(apiKey, model, messages);
        const parsed = JSON.parse(content);
        let itinerary = Array.isArray(parsed) ? parsed : parsed.itinerary || parsed.days || parsed;
        console.log(`[generate-itinerary] ✓ ${model} (${Array.isArray(itinerary) ? itinerary.length : '?'} days)`);

        // Fix all coordinates with real Mapbox geocoding
        console.log(`[generate-itinerary] Geocoding all locations...`);
        itinerary = await geocodeItinerary(itinerary);
        console.log(`[generate-itinerary] ✓ Geocoding done`);

        return NextResponse.json(itinerary);
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        console.warn(`[generate-itinerary] ✗ ${model}: ${lastError.slice(0, 120)}`);
        continue;
      }
    }

    throw new Error(`All models failed. Last: ${lastError}`);

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error generating itinerary:", errMsg);
    return NextResponse.json(
      { error: "Failed to generate itinerary", detail: errMsg },
      { status: 500 }
    );
  }
}
