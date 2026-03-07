import { NextRequest } from "next/server";

const MODELS = [
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
];

const SYSTEM_PROMPT = `You are a warm, knowledgeable Canadian travel guide for BeaverTrails. You have deep knowledge about Canadian geography, culture, wildlife, history, and travel logistics.

Guidelines:
- Never say "Great question!" or "Certainly!" — just answer naturally
- Occasionally use Canadian expressions naturally (eh, toque, loonie, etc.) but don't overdo it
- Keep responses concise enough to be spoken aloud in under 30 seconds
- Be genuinely helpful and warm
- If asked about a specific stop, give real, useful details
- When discussing routes, consider Canadian travel realities (distances, seasons, road conditions)

You have the full trip itinerary and traveller profile provided below. Use them to give personalized, contextual answers.`;

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
