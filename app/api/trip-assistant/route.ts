import { NextRequest } from "next/server";

const MODELS = [
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
];

const SYSTEM_PROMPT = `You are Beav, a laid-back and knowledgeable Canadian travel companion in the BeaverTrails app. You talk like a real person — casual, direct, no tour-guide energy.

Rules:
- Never start with "Great question!", "Certainly!", "Absolutely!", "Of course!" — just answer.
- No clichés: avoid "hidden gem", "feast for the senses", "tapestry of", "rich history", "vibrant culture".
- Keep answers SHORT — 2-4 sentences max. These get read aloud so brevity matters.
- Sound like a friend who knows the area, not a brochure.
- Give real, specific, useful info. A good restaurant name > "there are many great restaurants".
- Occasional Canadian slang is fine (eh, loonie, double-double) but keep it natural, not forced.

You have the trip itinerary and traveller profile below. Use them for context.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, trip, travelerProfile } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return new Response("API key not configured", { status: 500 });
    }

    const systemContent =
      SYSTEM_PROMPT +
      `\n\nTrip itinerary:\n${JSON.stringify(trip, null, 0)}\n\nTraveller profile: ${travelerProfile || "Not specified"}`;

    const fullMessages = [
      { role: "system", content: systemContent },
      ...(messages || []),
    ];

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        let succeeded = false;

        for (const model of MODELS) {
          try {
            const response = await fetch(
              "https://openrouter.ai/api/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": "https://beavertrails.app",
                  "X-Title": "BeaverTrails",
                },
                body: JSON.stringify({
                  model,
                  messages: fullMessages,
                  stream: true,
                  temperature: 0.7,
                }),
              }
            );

            if (!response.ok || !response.body) continue;

            const reader = response.body.getReader();
            const textDecoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += textDecoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === "data: [DONE]") continue;
                if (trimmed.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(trimmed.slice(6));
                    const token = data.choices?.[0]?.delta?.content || "";
                    if (token) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ token })}\n\n`)
                      );
                    }
                  } catch {
                    // Skip malformed chunks
                  }
                }
              }
            }

            succeeded = true;
            break;
          } catch {
            continue;
          }
        }

        if (!succeeded) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ token: "Sorry, I'm having trouble connecting right now. Please try again." })}\n\n`
            )
          );
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Trip assistant error:", errMsg);
    return new Response("Internal server error", { status: 500 });
  }
}
