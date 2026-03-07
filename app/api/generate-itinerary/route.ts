import { NextResponse } from "next/server";

const MODELS = [
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "stepfun/step-3.5-flash:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "arcee-ai/trinity-large-preview:free",
];

async function callOpenRouter(apiKey: string, model: string, messages: Array<{ role: string; content: string }>) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://beavertrails.app",
      "X-Title": "BeaverTrails",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter ${model} error ${response.status}: ${errText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`No content in response from ${model}`);
  }

  // Strip markdown code fences if present
  const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  return cleaned;
}

export async function POST(req: Request) {
  try {
    const surveyData = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
    }

    const prompt = `You are an expert Canadian travel agent. Generate a detailed daily itinerary for the following traveler.

Traveler Profile:
- Archetype: ${surveyData.travellerArchetype}
- Group: ${surveyData.groupComposition} (${surveyData.ageRange} yrs)
- Access Needs: ${surveyData.accessibilityNeeds.join(", ")}
- Duration: ${surveyData.tripDuration} days
- Budget: ${surveyData.budgetPerPerson}
- Starting City: ${surveyData.startingCity?.name || "Toronto"}
- Selected Activities: ${surveyData.activities.join(", ")}
- Dream Trip Notes: ${surveyData.dreamTrip || "None provided"}

Strict Rules:
1. You must route them through ONLY the recommended provinces: ${surveyData.recommendedProvinces.join(", ")}.
2. You MUST include at least 2 stops from destinations under 100k annual visitors (hidden gems).
3. Account for realistic travel methods between cities (e.g. flights across the country, driving locally).
4. You MUST provide highly accurate GPS coordinates [longitude, latitude] for every city and every stop.
5. Coordinates MUST be float arrays: [longitude, latitude] (e.g. [-114.07, 51.04]). Negative longitude for Canada!
6. Output MUST be a JSON array of Day objects. DO NOT OUTPUT ANYTHING ELSE. ONLY THE JSON ARRAY.

Day Object Schema:
{
  "date_offset": number (1 to ${surveyData.tripDuration}),
  "city": string,
  "city_coordinates": [number, number],
  "province": string,
  "stops": [
     { 
        "name": string, 
        "type": string (must be exactly 'park', 'restaurant', 'hotel', 'attraction', or 'other'),
        "coordinates": [number, number] (exact mapbox longitude, latitude floats)
     }
  ] (array of 2-4 points of interest),
  "overnight_hotel": string (a realistic hotel or lodge suggestion based on budget),
  "travel_time_from_prev_hours": number (estimated travel time in hours from the previous day's city. 0 for day 1.),
  "travel_method_from_prev": string (must be exactly one of: 'flight', 'drive', 'train', 'boat', or 'none')
}`;

    const messages = [
      { role: "system", content: "You are a specialized travel API that only outputs valid JSON arrays. Output ONLY the raw JSON array, no markdown, no code fences." },
      { role: "user", content: prompt },
    ];

    let lastError = "";
    for (const model of MODELS) {
      try {
        console.log(`[generate-itinerary] Trying model: ${model}`);
        const content = await callOpenRouter(apiKey, model, messages);
        const parsed = JSON.parse(content);
        // Handle if the model wraps the array in an object
        const itinerary = Array.isArray(parsed) ? parsed : parsed.itinerary || parsed.days || parsed;
        console.log(`[generate-itinerary] Success with model: ${model}`);
        return NextResponse.json(itinerary);
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        console.warn(`[generate-itinerary] ${model} failed: ${lastError}`);
        continue;
      }
    }

    throw new Error(`All models failed. Last error: ${lastError}`);

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error generating itinerary:", errMsg);
    return NextResponse.json(
      { error: "Failed to generate itinerary", detail: errMsg },
      { status: 500 }
    );
  }
}
