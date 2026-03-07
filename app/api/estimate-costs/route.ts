import { NextResponse } from "next/server";
import { CostEstimate } from "../../../types";

const MODELS = [
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "stepfun/step-3.5-flash:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "arcee-ai/trinity-large-preview:free",
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
      body: JSON.stringify({ model, messages, temperature: 0.3 }),
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
    const { trip, groupSize = 1 } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const budgetTier = trip?.budgetTier || trip?.travellerProfile?.toLowerCase().includes("budget")
      ? "budget"
      : "mid-range";

    const systemPrompt = `You are a Canadian travel cost estimator. Return ONLY a raw JSON array (no markdown) of cost estimates per day.

Each element must match this shape exactly:
{
  "day": 1,
  "city": "City Name",
  "accommodationLow": 80,
  "accommodationHigh": 150,
  "foodLow": 40,
  "foodHigh": 80,
  "transport": 30,
  "activities": 20
}

All values are in CAD per person. Budget tier affects estimates:
- budget: lower accommodation ($60-120), cheaper food ($30-60)
- mid-range: moderate ($100-200 accommodation, $50-100 food)
- luxury: premium ($200-500 accommodation, $80-200 food)

Return ONLY the JSON array.`;

    const days = trip?.days || [];
    const userMessage = `Trip budget tier: ${budgetTier}
Group size: ${groupSize}
Days:
${days.map((d: { date_offset: number; city: string; province: string; stops?: { name: string }[]; travel_method_from_prev: string }) => `Day ${d.date_offset}: ${d.city}, ${d.province} (${d.stops?.length || 0} stops, travel: ${d.travel_method_from_prev})`).join("\n")}

Generate per-day cost estimates per person. Scale transport costs by group size where appropriate.`;

    let lastError = "";
    for (const model of MODELS) {
      try {
        const content = await callOpenRouter(apiKey, model, [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ]);
        const parsed: CostEstimate[] = JSON.parse(content);
        return NextResponse.json(parsed);
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        continue;
      }
    }

    throw new Error(`All models failed. Last: ${lastError}`);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Estimate costs error:", errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
