import { NextResponse } from "next/server";

const MODELS = [
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "stepfun/step-3.5-flash:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "arcee-ai/trinity-large-preview:free",
];

const TIMEOUT_MS = 20000;

async function callOpenRouter(apiKey: string, model: string, messages: Array<{ role: string; content: string }>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
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
    const surveyData = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
    }

    const prompt = `Based on this traveler's profile, give them a fun archetype name (like "The Budget Urban Adventurer" or "The Luxury Nature Seeker") and recommend 1-3 Canadian provinces that suit them best.

They're ${surveyData.ageRange} years old, traveling as ${surveyData.groupComposition}, for ${surveyData.tripDuration} days on a ${surveyData.budgetPerPerson} budget, starting from ${surveyData.startingCity?.name || "somewhere in Canada"}.${surveyData.accessibilityNeeds?.length ? ` Accessibility needs: ${surveyData.accessibilityNeeds.join(", ")}.` : ""}

Return JSON: {"traveller_archetype": "...", "recommended_provinces": ["..."]}`;

    const messages = [
      { role: "system", content: "You are a Canadian travel expert. Respond with only raw JSON — no markdown, no extra text." },
      { role: "user", content: prompt },
    ];

    let lastError = "";
    for (const model of MODELS) {
      try {
        console.log(`[analyze-survey] Trying ${model}...`);
        const content = await callOpenRouter(apiKey, model, messages);
        const parsedData = JSON.parse(content);
        console.log(`[analyze-survey] ✓ ${model}`);
        return NextResponse.json(parsedData);
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        console.warn(`[analyze-survey] ✗ ${model}: ${lastError.slice(0, 100)}`);
        continue;
      }
    }

    throw new Error(`All models failed. Last: ${lastError}`);

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error analyzing survey:", errMsg);
    return NextResponse.json(
      { error: "Failed to analyze survey data", detail: errMsg },
      { status: 500 }
    );
  }
}
