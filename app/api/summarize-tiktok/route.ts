import { NextResponse } from "next/server";

export const maxDuration = 30;

const MODELS = [
  "google/gemini-2.5-pro",
  "google/gemini-3.1-pro-preview",
];

async function callOpenRouterMultimodal(
  apiKey: string,
  model: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any[]
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
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
        messages: [{ role: "user", content }],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`${model} error ${response.status}: ${errText.slice(0, 200)}`);
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content;
    if (!text) throw new Error(`No content from ${model}`);
    return text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
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
    const { url } = await req.json();

    if (!url || !String(url).includes("tiktok.com")) {
      return NextResponse.json({ summary: "", location: "" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
    }

    // Try TikTok oEmbed to get title and thumbnail
    let title = "";
    let thumbnailUrl = "";
    try {
      const oembedRes = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        title = oembed.title || "";
        thumbnailUrl = oembed.thumbnail_url || "";
      }
    } catch {
      // oEmbed failed — continue with text-only
    }

    const textPrompt = `TikTok URL: ${url}${title ? `\nTikTok caption: "${title}"` : ""}

Identify the travel location shown. Return JSON only: { "location": "<specific place name, city, province>", "summary": "<2-3 sentence description of what this place is, why it's worth visiting, and what vibe it has>" }`;

    const messageContent = thumbnailUrl
      ? [
          { type: "image_url", image_url: { url: thumbnailUrl } },
          { type: "text", text: textPrompt },
        ]
      : [{ type: "text", text: textPrompt }];

    // Sequential fallback
    let lastError: Error | null = null;
    for (const model of MODELS) {
      try {
        const raw = await callOpenRouterMultimodal(apiKey, model, messageContent);
        const parsed = JSON.parse(raw);
        if (parsed.location || parsed.summary) {
          return NextResponse.json({
            summary: parsed.summary || "",
            location: parsed.location || "",
          });
        }
        throw new Error("Empty response");
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[summarize-tiktok] ${model} failed: ${lastError.message.slice(0, 100)}`);
      }
    }

    console.error("[summarize-tiktok] All models failed:", lastError?.message);
    return NextResponse.json({ summary: "", location: "" });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[summarize-tiktok] Error:", errMsg);
    return NextResponse.json({ summary: "", location: "" });
  }
}
