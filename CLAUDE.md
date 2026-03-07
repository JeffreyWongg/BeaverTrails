# BeaverTrails 🦫

> AI-powered immersive Canadian trip planner — Hackathon Edition 2025

## Project Overview

BeaverTrails is a full-stack web app that delivers hyper-personalized Canadian travel itineraries. It walks users through a smart onboarding survey, generates a multi-stop route using Claude, previews the trip on a live animated Mapbox map with ambient audio and AI narration, and exports a branded PDF itinerary.

---

## Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** TailwindCSS
- **Animations:** Framer Motion
- **Map:** Mapbox GL JS (routing, 3D terrain, custom markers)
- **Audio:** Howler.js (ambient audio layers from Freesound.org CC0)
- **State:** Zustand
- **PDF:** `@react-pdf/renderer` (client-side) or Puppeteer (headless)

### AI & Voice
- **LLM:** Anthropic `claude-sonnet-4-20250514` via `@anthropic-ai/sdk`
- **Voice Narration:** ElevenLabs Turbo v2.5 (voice: Charlotte)
- **Structured outputs:** Anthropic tool-use for JSON responses

### Data & Auth
- **Database:** Supabase (Postgres + Storage)
- **Auth:** Clerk (optional); `localStorage` fallback for anonymous sessions
- **POI Enrichment:** Google Places API; OpenStreetMap fallback for rural/NWT/Yukon areas
- **Images:** Unsplash API (stop hero carousels)
- **QR Codes:** `qrcode.react`

---

## Folder Structure

```
/app          # Next.js App Router routes
/components   # Reusable UI components
/lib          # API helpers and utilities
/types        # Shared TypeScript interfaces
```

---

## Key Types

```ts
interface Trip {
  id: string;
  title: string;
  days: Day[];
  travellerProfile: TravellerProfile;
  totalCostEstimate: { low: number; high: number };
}

interface Day {
  dateOffset: number;
  city: string;
  province: string;
  stops: Stop[];
  overnightHotel: string;
  driveTimeFromPrevHours: number;
}
```

---

## Environment Variables

```env
NEXT_PUBLIC_MAPBOX_TOKEN=
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/analyze-survey` | POST | Accepts survey answers → returns `traveller_archetype` + `recommended_provinces` JSON |
| `/api/generate-itinerary` | POST | Accepts preferences → streams `Day[]` JSON array. Must include ≥2 stops from destinations with <100k annual visitors |
| `/api/narrate` | POST | Accepts stop details → streams AI description word-by-word. Supports `time_of_day: night` |
| `/api/speak` | POST | Calls ElevenLabs TTS → returns audio for Howler playback |
| `/api/trip-assistant` | POST | Full conversation history + serialized itinerary → streams Claude response |
| `/api/swap-stop` | POST | Free-text swap request → returns replacement stop JSON matching geo + archetype constraints |
| `/api/estimate-costs` | POST | Itinerary → day-by-day cost breakdown (accommodation/food/transport/activities, low+high) |
| `/api/packing-list` | POST | Traveller profile + itinerary → 6-category packing list |

---

## Pages & Components

### Pages
- `/` — Landing page with full-screen Canada hero, BeaverTrails logo, tagline, and "Plan My Trip" CTA
- `/survey` — 7-step onboarding wizard (age, accessibility, group, duration, budget, luggage, starting city)
- `/preferences` — 12-activity toggle grid + free-text dream trip field + itinerary generation trigger
- `/trip` — Interactive route map (70%) + scrollable day sidebar (30%) + floating chat button
- `/checkout` — Itinerary timeline, cost table, group size scaler, packing list, PDF export

### Key Components
- **`ImmersiveDrawer`** — Full-height slide-in panel: image carousel, AI narration stream, ElevenLabs audio, ambient sound, night mode toggle, inline Q&A, stop swap trigger
- **`TripAssistant`** — Floating 400px chat panel (bottom-right), streaming Claude responses, 4 starter question chips, full itinerary in system prompt
- **`SwapModal`** — Free-text stop replacement, animates swap on confirmation
- **`TripPDF`** — React-PDF component: cover page, per-day pages, packing list, emergency contacts, QR code

---

## Mapbox Configuration

- **Style:** `mapbox://styles/mapbox/outdoors-v12`
- **Terrain:** `mapbox-dem`, exaggeration `1.5`
- **On load:** Animate camera from zoom 3 over Canada to first stop
- **Markers:** Custom emoji by type (parks / restaurants / hotels / attractions)
- **Route line:** Animated dashed polyline drawing over 2s via `line-dasharray`
- **Modes:** Road Trip (Mapbox Directions API) vs Fly Between Cities (straight lines)

---

## Ambient Audio Map

| Destination Type | Audio File |
|---|---|
| Parks / Nature | `forest_birds.mp3` |
| Urban | `city_ambient.mp3` |
| Coastal | `ocean_waves.mp3` |

---

## PDF Template Spec

- **Colors:** Red `#CC0000` headers; maple leaf watermark at 5% opacity per page
- **Pages:** Cover → Per-day pages → Packing list → Emergency contacts → QR code
- **Emergency contacts:** Parks Canada `1-888-773-8888`, CAA `1-800-222-4357`, provincial tourism boards
- **File naming:** `beavertrails-[trip-title].pdf`
- **Map image:** Mapbox Static API snapshot of full route on cover

---

## AI Behaviour Notes

- Itinerary generation **must include at least 2 stops** from destinations with fewer than 100,000 annual visitors (e.g. Tuktut Nogait NWT, Fogo Island NL, Riding Mountain MB)
- `TripAssistant` system prompt must contain the **full serialized itinerary JSON** and traveller profile
- TripAssistant persona: warm Canadian guide — **never says "Great question!"**
- All Claude calls use `claude-sonnet-4-20250514`; `max_tokens: 1000` for chat

---

