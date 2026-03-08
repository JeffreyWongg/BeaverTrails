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
    const { stopName, stopType, stopNotes, timeOfDay = "Day", season = "Summer", preGeneratedText } =
      await req.json();

    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
    }

    const elevenlabsKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_CHARLOTTE_VOICE_ID || "XB0fDUnXU5powFXDhCwa";

    // Step 1: Generate narration text (skip if pre-generated text provided)
    let narrationText: string = preGeneratedText || "";
    if (!narrationText) {
      const systemPrompt = `You are Beav, a chill and knowledgeable Canadian travel companion. You talk like a real person — casual, warm, no dramatic voiceover energy. Think of how a well-traveled friend would describe a place they love.

Rules:
- 2-3 short sentences MAX. Be concise.
- Sound natural. No "Welcome to..." or "Behold..." or "Picture this..." intros.
- No clichés like "hidden gem", "feast for the senses", "tapestry of", "nestled between".
- Don't over-describe. Pick ONE interesting detail and mention it naturally.
- Match the vibe of the time/season without being heavy-handed about it.
- Return ONLY the narration text. No quotes, labels, or formatting.`;

      const userPrompt = `Location: ${stopName} (${stopType})${stopNotes ? ` — ${stopNotes}` : ""}
Time: ${timeOfDay}, ${season}

Describe this place like you're casually telling a friend about it.`;

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
            stability: 0.4,
            similarity_boost: 0.8,
            style: 0.3,
            use_speaker_boost: true,
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
        "X-Narration-Text": encodeURIComponent(narrationText),
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Speak API error:", errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
