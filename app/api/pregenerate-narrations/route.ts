import { NextRequest, NextResponse } from "next/server";

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
      body: JSON.stringify({ model, messages, temperature: 0.7 }),
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
    return content.trim();
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`${model} timed out`);
    }
    throw err;
  }
}

async function generateNarration(
  apiKey: string,
  stop: { key: string; name: string; type: string; notes: string },
  timeOfDay: string,
  season: string
): Promise<{ key: string; text: string }> {
  const systemPrompt = `You are a vivid travel narrator describing Canadian locations. Write exactly 3-4 short, immersive sentences. Be sensory — describe sights, sounds, smells. Match the time of day and season. Return ONLY the narration text, no quotes or extra formatting.`;

  const userPrompt = `Location: ${stop.name} (${stop.type})${stop.notes ? ` — ${stop.notes}` : ""}
Time of day: ${timeOfDay}
Season: ${season}

Write a vivid, sensory narration for this stop.`;

  for (const model of MODELS) {
    try {
      const text = await callOpenRouter(apiKey, model, [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);
      return { key: `${stop.key}_${timeOfDay}_${season}`, text };
    } catch {
      continue;
    }
  }

  throw new Error(`All models failed for stop: ${stop.name}`);
}

export async function POST(req: NextRequest) {
  try {
    const { stops, timeOfDay = "Day", season = "Summer" } = await req.json();

    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
    }

    if (!Array.isArray(stops) || stops.length === 0) {
      return NextResponse.json({ scripts: {} });
    }

    const results = await Promise.allSettled(
      stops.map((stop) => generateNarration(openrouterKey, stop, timeOfDay, season))
    );

    const scripts: Record<string, string> = {};
    for (const result of results) {
      if (result.status === "fulfilled") {
        scripts[result.value.key] = result.value.text;
      }
    }

    return NextResponse.json({ scripts });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Pregenerate narrations error:", errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
