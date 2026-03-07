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

export async function POST(req: NextRequest) {
  try {
    const { stopName, stopType, stopNotes, timeOfDay = "Day", season = "Summer" } =
      await req.json();

    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
    }

    const elevenlabsKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_CHARLOTTE_VOICE_ID || "XB0fDUnXU5powFXDhCwa";

    // Step 1: Generate narration text via OpenRouter
    const systemPrompt = `You are a vivid travel narrator describing Canadian locations. Write exactly 3-4 short, immersive sentences. Be sensory — describe sights, sounds, smells. Match the time of day and season. Return ONLY the narration text, no quotes or extra formatting.`;

    const userPrompt = `Location: ${stopName} (${stopType})${stopNotes ? ` — ${stopNotes}` : ""}
Time of day: ${timeOfDay}
Season: ${season}

Write a vivid, sensory narration for this stop.`;

    let narrationText = "";
    let lastError = "";
    for (const model of MODELS) {
      try {
        narrationText = await callOpenRouter(openrouterKey, model, [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ]);
        break;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        continue;
      }
    }

    if (!narrationText) {
      return NextResponse.json(
        { error: `Narration generation failed: ${lastError}` },
        { status: 500 }
      );
    }

    // Step 2: Convert to speech via ElevenLabs
    if (!elevenlabsKey || elevenlabsKey.startsWith("TODO")) {
      // Return the text as fallback if ElevenLabs not configured
      return NextResponse.json({ text: narrationText });
    }

    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenlabsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: narrationText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errText = await ttsResponse.text();
      console.error("ElevenLabs error:", errText);
      return NextResponse.json({ text: narrationText });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Speak API error:", errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
