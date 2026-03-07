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
      3. Output MUST be an array of Day objects.
      4. DO NOT OUTPUT ANYTHING ELSE. ONLY JSON.

      Day Object Schema:
      {
        "date_offset": number (1 to ${surveyData.tripDuration}),
        "city": string,
        "province": string,
        "stops": string[] (array of 2-4 points of interest),
        "overnight_hotel": string (a realistic hotel or lodge suggestion based on budget),
        "drive_time_from_prev_hours": number (estimated driving time in hours from the previous day's city. 0 for day 1.)
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
