import { NextResponse } from "next/server";

export const maxDuration = 120;

const WORLDLABS_API_KEY = process.env.WORLDLABS_API_KEY || "";
const WORLDLABS_BASE = "https://api.worldlabs.ai/marble/v1";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// POST — start world generation
export async function POST(req: Request) {
  try {
    const { stopName, coordinates, userPrompt } = await req.json();

    if (!WORLDLABS_API_KEY) {
      return NextResponse.json({ error: "World Labs API key not configured" }, { status: 500 });
    }

    const [lng, lat] = coordinates;

    const textPrompt = [
      `Photorealistic view of ${stopName}, Canada`,
      `(coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}).`,
      userPrompt.trim(),
      "Immersive, explorable, cinematic lighting, high detail, photorealistic environment.",
    ].join(" ");

    console.log(`[imagine] Starting generation for "${stopName}" — "${userPrompt}"`);

    const body = {
      display_name: `${stopName} — ${userPrompt}`.slice(0, 100),
      model: "Marble 0.1-mini", // Fast (30-45s), includes panorama
      world_prompt: {
        type: "text",
        text_prompt: textPrompt,
      },
    };

    const response = await fetch(`${WORLDLABS_BASE}/worlds:generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "WLT-Api-Key": WORLDLABS_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    if (!response.ok) {
      console.error(`[imagine] Error ${response.status}: ${responseText}`);
      let userMessage = "Failed to start world generation";
      if (response.status === 402) {
        userMessage = "World Labs credits exhausted — add credits at worldlabs.ai to continue generating worlds.";
      } else if (response.status === 429) {
        userMessage = "World Labs rate limit hit — wait a moment and try again.";
      } else if (response.status === 401) {
        userMessage = "World Labs API key is invalid or expired.";
      }
      return NextResponse.json(
        { error: userMessage, detail: responseText },
        { status: response.status }
      );
    }

    const data = JSON.parse(responseText);
    const worldId = data.metadata?.world_id || null;
    console.log(`[imagine] ✓ Started — op: ${data.operation_id}, world: ${worldId}`);

    return NextResponse.json({
      operationId: data.operation_id,
      worldId,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[imagine] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Helper: fetch full world assets
async function getWorldAssets(worldId: string) {
  const res = await fetch(`${WORLDLABS_BASE}/worlds/${worldId}`, {
    method: "GET",
    headers: { "WLT-Api-Key": WORLDLABS_API_KEY },
  });
  if (!res.ok) return null;
  return await res.json();
}

// GET — poll operation status + world assets
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const operationId = searchParams.get("op");
    const worldIdParam = searchParams.get("worldId");

    if (!operationId) {
      return NextResponse.json({ error: "Missing operation ID" }, { status: 400 });
    }
    if (!WORLDLABS_API_KEY) {
      return NextResponse.json({ error: "World Labs API key not configured" }, { status: 500 });
    }

    // If we already know the world is created, go directly to checking for the pano
    if (worldIdParam) {
      const world = await getWorldAssets(worldIdParam);
      if (world) {
        const panoUrl = world.assets?.imagery?.pano_url || null;
        const thumbnailUrl = world.assets?.thumbnail_url || null;
        const caption = world.assets?.caption || null;

        if (panoUrl) {
          console.log(`[imagine] ✓ Pano ready: ${panoUrl}`);
          return NextResponse.json({
            done: true,
            panoUrl,
            thumbnailUrl,
            caption,
          });
        }

        // Pano not ready yet — retry with a short delay
        await sleep(3000);
        const world2 = await getWorldAssets(worldIdParam);
        const panoUrl2 = world2?.assets?.imagery?.pano_url || null;

        if (panoUrl2) {
          console.log(`[imagine] ✓ Pano ready (retry): ${panoUrl2}`);
          return NextResponse.json({
            done: true,
            panoUrl: panoUrl2,
            thumbnailUrl: world2?.assets?.thumbnail_url || thumbnailUrl,
            caption: world2?.assets?.caption || caption,
          });
        }

        // Still no pano — tell client to keep polling
        console.log(`[imagine] Pano not ready yet, telling client to retry...`);
        return NextResponse.json({
          done: false,
          status: "PANO_PENDING",
          description: "World created, generating panorama...",
          worldId: worldIdParam,
          thumbnailUrl,
          caption,
        });
      }
    }

    // Check operation status
    const response = await fetch(`${WORLDLABS_BASE}/operations/${operationId}`, {
      method: "GET",
      headers: { "WLT-Api-Key": WORLDLABS_API_KEY },
    });

    const responseText = await response.text();
    if (!response.ok) {
      console.error(`[imagine] Poll error ${response.status}: ${responseText}`);
      return NextResponse.json(
        { error: "Failed to poll operation", detail: responseText },
        { status: response.status }
      );
    }

    const data = JSON.parse(responseText);

    if (data.done && data.response) {
      const worldId = data.response.id || data.metadata?.world_id;
      console.log(`[imagine] ✓ Operation done. World: ${worldId}`);

      // Check the snapshot first
      let panoUrl = data.response.assets?.imagery?.pano_url || null;
      const thumbnailUrl = data.response.assets?.thumbnail_url || null;
      const caption = data.response.assets?.caption || null;

      if (panoUrl) {
        console.log(`[imagine] ✓ Pano in snapshot: ${panoUrl}`);
        return NextResponse.json({ done: true, worldId, panoUrl, thumbnailUrl, caption });
      }

      // Pano not in snapshot — fetch full world (it might be ready there)
      if (worldId) {
        console.log(`[imagine] No pano in snapshot, fetching full world...`);
        const fullWorld = await getWorldAssets(worldId);
        panoUrl = fullWorld?.assets?.imagery?.pano_url || null;

        if (panoUrl) {
          console.log(`[imagine] ✓ Pano in full world: ${panoUrl}`);
          return NextResponse.json({
            done: true,
            worldId,
            panoUrl,
            thumbnailUrl: fullWorld?.assets?.thumbnail_url || thumbnailUrl,
            caption: fullWorld?.assets?.caption || caption,
          });
        }

        // Wait 3s and try once more
        await sleep(3000);
        const fullWorld2 = await getWorldAssets(worldId);
        panoUrl = fullWorld2?.assets?.imagery?.pano_url || null;

        if (panoUrl) {
          console.log(`[imagine] ✓ Pano ready (delayed): ${panoUrl}`);
          return NextResponse.json({
            done: true,
            worldId,
            panoUrl,
            thumbnailUrl: fullWorld2?.assets?.thumbnail_url || thumbnailUrl,
            caption: fullWorld2?.assets?.caption || caption,
          });
        }

        // Still not ready — tell client the world is created but to keep polling for pano
        console.log(`[imagine] Pano still not ready, client should keep polling with worldId`);
        return NextResponse.json({
          done: false,
          status: "PANO_PENDING",
          description: "World created, generating panorama...",
          worldId,
          thumbnailUrl,
          caption,
        });
      }

      // No worldId somehow — just return what we have
      return NextResponse.json({ done: true, worldId, panoUrl: null, thumbnailUrl, caption });
    }

    if (data.error) {
      console.error(`[imagine] Generation error:`, JSON.stringify(data.error));
      return NextResponse.json({
        done: true,
        error: typeof data.error === "string" ? data.error : JSON.stringify(data.error),
      });
    }

    // Operation still in progress
    const status = data.metadata?.progress?.status || "IN_PROGRESS";
    const description = data.metadata?.progress?.description || "Generating world...";
    const worldId = data.metadata?.world_id || null;

    return NextResponse.json({ done: false, status, description, worldId });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[imagine] Poll error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
