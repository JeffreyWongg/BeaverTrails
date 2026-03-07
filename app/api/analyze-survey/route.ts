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
      You are an expert Canadian travel agent. Analyze the following traveler survey profile and recommend an archetype and 1-3 Canadian provinces/territories that best fit their needs.

      Survey Profile:
      - Age Range: ${surveyData.ageRange}
      - Accessibility Needs: ${surveyData.accessibilityNeeds.join(", ")}
      - Group Composition: ${surveyData.groupComposition}
      - Trip Duration: ${surveyData.tripDuration} days
      - Budget: ${surveyData.budgetPerPerson}
      - Luggage: ${surveyData.luggageAmount}
      - Starting City: ${surveyData.startingCity?.name || "Unknown"}

      Respond strictly with a JSON object containing exactly two keys:
      1. "traveller_archetype" (string, e.g. "The Luxury Wildlife Explorer", "The Budget Urban Adventurer")
      2. "recommended_provinces" (array of strings, e.g. ["British Columbia", "Alberta"])
      
      Do not include any other text in your response, just the JSON string.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
          responseMimeType: "application/json",
          temperature: 0.7,
          systemInstruction: "You are a specialized travel API that only outputs valid JSON.",
      }
    });

    if (!response.text) {
       throw new Error("Unexpected API response format");
    }
    
    const parsedData = JSON.parse(response.text);
    return NextResponse.json(parsedData);

  } catch (error) {
    console.error("Error analyzing survey:", error);
    return NextResponse.json(
      { error: "Failed to analyze survey data" },
      { status: 500 }
    );
  }
}
