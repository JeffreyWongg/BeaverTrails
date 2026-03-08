import { NextResponse } from "next/server";

export const maxDuration = 60;

const MODELS = [
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
];

const PER_MODEL_TIMEOUT = 25000;

const MASTER_PROMPT = `You are Beav, a chill and helpful Canadian travel buddy for BeaverTrails. The user will show you their trip itinerary (as JSON) and ask you to tweak it.

Keep changes small and targeted — just adjust what they ask for. Don't rewrite the whole thing. Keep the same JSON structure and make sure all coordinates are accurate [longitude, latitude] (negative longitude for Canada). Every day needs its hotel coordinates, and flight days need an "airport" field plus the airport as a stop.

Every stop must have a "description" — a short 1-2 sentence blurb about why it's worth visiting. When suggesting new stops, lean toward hidden gems, local favorites, and lesser-known places. BeaverTrails is about discovery.

If they want to change something, return:
{"message": "friendly explanation of what you changed", "itinerary": [the full updated itinerary]}

If they're just asking a question, return:
{"message": "your helpful answer", "itinerary": null}

Always respond with raw JSON — no markdown, no code fences.`;

async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_MODEL_TIMEOUT);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
      throw new Error(`${model} timed out`);
    }
    throw err;
  }
}

export async function POST(req: Request) {
  try {
    const { message, itinerary, history } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: MASTER_PROMPT },
      { role: "user", content: `Current itinerary:\n${JSON.stringify(itinerary)}` },
    ];

    if (history && Array.isArray(history)) {
      for (const h of history.slice(-4)) {
        messages.push({ role: h.role, content: h.content });
      }
    }

    messages.push({ role: "user", content: message });

    // Race all models in parallel — first valid response wins
    console.log(`[chat] Racing ${MODELS.length} models in parallel...`);

    const raceAttempts = MODELS.map(async (model) => {
      try {
        const content = await callOpenRouter(apiKey, model, messages);
        const parsed = JSON.parse(content);
        console.log(`[chat] ✓ ${model} won the race`);
        return parsed;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[chat] ✗ ${model}: ${msg.slice(0, 100)}`);
        throw err;
      }
    });

    try {
      const result = await Promise.any(raceAttempts);
      return NextResponse.json(result);
    } catch {
      throw new Error("All models failed or timed out.");
    }

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Chat error:", errMsg);
    return NextResponse.json(
      { message: "Sorry, I had trouble processing that. Please try again.", itinerary: null },
      { status: 200 }
    );
  }
}
