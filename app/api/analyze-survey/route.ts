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

    const prompt = `You are an expert Canadian travel agent. Analyze the following traveler survey profile and recommend an archetype and 1-3 Canadian provinces/territories that best fit their needs.

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

Do not include any other text in your response, just the JSON object.`;

    const messages = [
      { role: "system", content: "You are a specialized travel API that only outputs valid JSON. Do not wrap your response in markdown code fences." },
      { role: "user", content: prompt },
    ];

    let lastError = "";
    for (const model of MODELS) {
      try {
        console.log(`[analyze-survey] Trying model: ${model}`);
        const content = await callOpenRouter(apiKey, model, messages);
        const parsedData = JSON.parse(content);
        console.log(`[analyze-survey] Success with model: ${model}`);
        return NextResponse.json(parsedData);
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        console.warn(`[analyze-survey] ${model} failed: ${lastError}`);
        continue;
      }
    }

    throw new Error(`All models failed. Last error: ${lastError}`);

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error analyzing survey:", errMsg);
    return NextResponse.json(
      { error: "Failed to analyze survey data", detail: errMsg },
      { status: 500 }
    );
  }
}
