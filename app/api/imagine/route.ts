import { NextResponse } from "next/server";

export const maxDuration = 120;

const WORLDLABS_API_KEY = process.env.WORLDLABS_API_KEY || "";
const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
const WORLDLABS_BASE = "https://api.worldlabs.ai/marble/v1";

// POST — start world generation
export async function POST(req: Request) {
  try {
    const { stopName, coordinates, userPrompt } = await req.json();

    if (!WORLDLABS_API_KEY) {
      return NextResponse.json({ error: "World Labs API key not configured" }, { status: 500 });
    }

    const [lng, lat] = coordinates;

    // Build the text prompt combining location context + user's imagination
    const textPrompt = `${stopName} in Canada — ${userPrompt}. Photorealistic, immersive, explorable environment.`;

    // Try to use Street View Static image as the base if Google Maps key is available
    let worldPrompt: Record<string, unknown>;

    if (GOOGLE_MAPS_KEY) {
      const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x640&location=${lat},${lng}&fov=90&heading=0&pitch=0&key=${GOOGLE_MAPS_KEY}`;

      worldPrompt = {
        type: "image",
        image_prompt: {
          source: "uri",
          uri: streetViewUrl,
        },
        text_prompt: textPrompt,
      };
    } else {
      // Fallback to text-only generation
      worldPrompt = {
        type: "text",
        text_prompt: textPrompt,
      };
    }

    console.log(`[imagine] Starting world generation for "${stopName}" — "${userPrompt}"`);

    const response = await fetch(`${WORLDLABS_BASE}/worlds:generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "WLT-Api-Key": WORLDLABS_API_KEY,
      },
      body: JSON.stringify({
        display_name: `${stopName} — ${userPrompt}`,
        model: "Marble 0.1-mini", // 30-45s, faster for interactive use
        world_prompt: worldPrompt,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[imagine] World Labs error ${response.status}: ${errText}`);
      return NextResponse.json(
        { error: "Failed to start world generation", detail: errText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[imagine] ✓ Generation started — operation: ${data.operation_id}`);

    return NextResponse.json({
      operationId: data.operation_id,
      worldId: data.metadata?.world_id || null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[imagine] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET — poll operation status
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const operationId = searchParams.get("op");

    if (!operationId) {
      return NextResponse.json({ error: "Missing operation ID" }, { status: 400 });
    }

    if (!WORLDLABS_API_KEY) {
      return NextResponse.json({ error: "World Labs API key not configured" }, { status: 500 });
    }

    const response = await fetch(`${WORLDLABS_BASE}/operations/${operationId}`, {
      method: "GET",
      headers: {
        "WLT-Api-Key": WORLDLABS_API_KEY,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: "Failed to poll operation", detail: errText },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.done && data.response) {
      // World is ready!
      console.log(`[imagine] ✓ World ready — ${data.response.world_marble_url}`);
      return NextResponse.json({
        done: true,
        worldUrl: data.response.world_marble_url,
        worldId: data.response.id,
        thumbnailUrl: data.response.assets?.thumbnail_url || null,
        panoUrl: data.response.assets?.imagery?.pano_url || null,
        caption: data.response.assets?.caption || null,
      });
    }

    if (data.error) {
      return NextResponse.json({
        done: true,
        error: data.error,
      });
    }

    // Still in progress
    return NextResponse.json({
      done: false,
      status: data.metadata?.progress?.status || "IN_PROGRESS",
      description: data.metadata?.progress?.description || "Generating world...",
      worldId: data.metadata?.world_id || null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[imagine] Poll error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
