import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const surveyData = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });

    const prompt = `
      You are an expert Canadian travel agent. Generate a detailed daily itinerary for the following traveler.

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
      6. Output MUST be an array of Day objects. DO NOT OUTPUT ANYTHING ELSE. ONLY JSON.

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
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
          responseMimeType: "application/json",
          temperature: 0.7,
          systemInstruction: "You are a specialized travel API that only outputs valid JSON arrays.",
      }
    });
    
    if (!response.text) {
       throw new Error("Unexpected API response format");
    }
    
    const itinerary = JSON.parse(response.text);
    return NextResponse.json(itinerary);

  } catch (error) {
    console.error("Error generating itinerary:", error);
    return NextResponse.json(
      { error: "Failed to generate itinerary" },
      { status: 500 }
    );
  }
}
