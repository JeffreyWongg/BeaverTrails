import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: Request) {
  try {
    const surveyData = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const anthropic = new Anthropic({
        apiKey: apiKey
    });

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

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      temperature: 0.7,
      system: "You are a specialized travel API that only outputs valid JSON arrays.",
      messages: [
        { role: "user", content: prompt }
      ]
    });
    
    const block = response.content[0];
    if (block.type !== 'text') {
       throw new Error("Unexpected API response format");
    }
    
    // Sometimes Claude wraps arrays in markdown blocks
    const cleanedText = block.text.replace(/```json\n?|\n?```/g, '');
    const itinerary = JSON.parse(cleanedText);
    
    return NextResponse.json(itinerary);

  } catch (error) {
    console.error("Error generating itinerary:", error);
    return NextResponse.json(
      { error: "Failed to generate itinerary" },
      { status: 500 }
    );
  }
}
