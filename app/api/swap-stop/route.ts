import { NextResponse } from "next/server";

const MODELS = [
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
];

const TIMEOUT_MS = 30000;

async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://beavertrails.app",
        "X-Title": "BeaverTrails",
      },
      body: JSON.stringify({ model, messages, temperature: 0.6 }),
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
      throw new Error(`${model} timed out`);
    }
    throw err;
  }
}

export async function POST(req: Request) {
  try {
    const { currentStop, userSuggestion, neighbouringStops, travelerProfile } =
      await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const systemPrompt = `You are a Canadian travel expert for BeaverTrails. Your task is to suggest a replacement stop for a traveller's itinerary.

Return ONLY a raw JSON object (no markdown, no code fences) matching this exact shape:
{
  "name": "Stop Name",
  "type": "park|restaurant|hotel|attraction|other",
  "coordinates": [longitude, latitude],
  "description": "1-2 sentence description",
  "estimatedCost": "Free|$10-20|$20-50 etc",
  "notes": "Any helpful notes"
}

Rules:
- Coordinates must be realistic Canadian coordinates [longitude (negative), latitude]
- The replacement must be in the same general area as the current stop's neighbours
- Consider the traveller profile when suggesting alternatives
- Lean toward hidden gems and local favourites
- Return ONLY the JSON object, nothing else`;

    const userMessage = `Current stop to replace: ${JSON.stringify(currentStop)}
User's request: "${userSuggestion}"
Neighbouring stops for geographic context: ${JSON.stringify(neighbouringStops?.slice(0, 3))}
Traveller profile: ${travelerProfile || "Not specified"}

Suggest a replacement stop.`;

    let lastError = "";
    for (const model of MODELS) {
      try {
        const content = await callOpenRouter(apiKey, model, [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ]);
        const parsed = JSON.parse(content);
        return NextResponse.json(parsed);
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        continue;
      }
    }

    throw new Error(`All models failed. Last: ${lastError}`);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Swap stop error:", errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
