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

export interface PackingCategory {
  category: string;
  items: string[];
}

export async function POST(req: Request) {
  try {
    const { trip, travelerProfile } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const provinces = Array.from(
      new Set((trip?.days || []).map((d: { province: string }) => d.province))
    ).join(", ");

    const activities = (trip?.days || [])
      .flatMap((d: { stops?: { type: string }[] }) => (d.stops || []).map((s) => s.type))
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
      .join(", ");

    const systemPrompt = `You are a Canadian travel packing expert. Create a packing list for a Canadian road trip.

Return ONLY a raw JSON array (no markdown) with exactly 6 elements, one per category:
[
  { "category": "Clothing", "items": ["item1", "item2", ...] },
  { "category": "Gear & Outdoors", "items": [...] },
  { "category": "Documents & Money", "items": [...] },
  { "category": "Health & Safety", "items": [...] },
  { "category": "Tech & Entertainment", "items": [...] },
  { "category": "Misc", "items": [...] }
]

Each category should have 5-10 relevant items. Tailor items to the specific provinces and activities.`;

    const userMessage = `Trip provinces: ${provinces}
Activity types: ${activities}
Traveller profile: ${travelerProfile || "Not specified"}
Trip duration: ${trip?.days?.length || 7} days

Generate a comprehensive, Canada-specific packing list.`;

    let lastError = "";
    for (const model of MODELS) {
      try {
        const content = await callOpenRouter(apiKey, model, [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ]);
        const parsed: PackingCategory[] = JSON.parse(content);
        return NextResponse.json(parsed);
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        continue;
      }
    }

    throw new Error(`All models failed. Last: ${lastError}`);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Packing list error:", errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
