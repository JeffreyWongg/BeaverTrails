# Prompt 5 — Immersive Stop Drawer & Full-Screen Experience

## Branch
Ensure you are on `ethan2` before making any changes.

## Overview
Clicking a map marker or stop card opens an `ImmersiveDrawer` with stop details and an "Enter Immersive View 🌍" button. That button launches a full-screen immersive experience with 360° Street View (or Mapbox fallback), ambient audio, AI voice narration, time-of-day/season controls, and in-immersion voice Q&A.

---

## API Routes Needed

### `POST /api/speak`
Accepts: `{ stopName, stopType, stopNotes, timeOfDay?, season? }`

- Use the existing OpenRouter setup in the codebase (same model, same helper — do not change it)
- Prompt the model to write a 3–4 sentence vivid, sensory narration for the stop given the time/season context
- Pass the generated text to ElevenLabs TTS using the Charlotte voice (`ELEVENLABS_CHARLOTTE_VOICE_ID` from env)
- Return the audio as a binary blob with `Content-Type: audio/mpeg`

---

## ImmersiveDrawer Component

A slide-in panel showing:
- Stop name, type, address, estimated cost, notes
- Street View availability read from Zustand `streetViewCoverage[stop.id]` — no re-fetch
- "Enter Immersive View 🌍" button

---

## Full-Screen Immersive View

When "Enter Immersive View" is clicked, hide all app UI and render a `100vw x 100vh` immersive layer.

### 360° View
- **If Street View available:** `google.maps.StreetViewPanorama` with `disableDefaultUI: true`
- **Fallback:** Mapbox canvas at `pitch: 70` with bearing auto-rotating 360°

### On Load — Fire Both Simultaneously
1. **Ambient audio** via Howler.js — looping soundscape matched to stop type, faded in over 1.5s at volume 0.35:
   - `park / mountain` → birds + wind
   - `restaurant / market` → gentle crowd murmur
   - `beach` → waves + gulls
   - `historic / museum / attraction` → soft ambient interior hum
   - Default → light wind

2. **AI intro narration** — POST to `/api/speak` with stop context and default time/season. Auto-play the returned audio blob. While playing, show a minimal top-left HUD with the stop name and a pulsing 🔴 "Live" badge.

### Time of Day Toggle (floating bottom-center pill)
Options: **Dawn / Day / Dusk / Night**

Each option:
- Applies a CSS filter overlay on the panorama:
  - Dawn → warm orange tint + slight blur
  - Day → no filter
  - Dusk → amber tint + contrast boost
  - Night → dark overlay + blue tint + `brightness(0.4)`
- Swaps ambient audio loop (Day → birds, Night → crickets, Dusk → evening wind, Dawn → early birds)
- Re-triggers `/api/speak` with new time context → new ElevenLabs narration plays

### Season Toggle (same floating pill)
Options: **Spring / Summer / Fall / Winter**

Each option:
- Applies a subtle CSS filter:
  - Spring → slight green tint + `brightness(1.05)`
  - Summer → no filter
  - Fall → warm amber + `hue-rotate(15deg)`
  - Winter → `desaturate(60%)` + `brightness(1.1)` + cool blue tint
- Re-triggers `/api/speak` with seasonal context → new narration plays

### In-Immersion Voice Q&A
A 🎙️ mic button in the bottom-right:
1. Web Speech API (`SpeechRecognition`) captures the user's spoken question
2. POST transcript to `/api/trip-assistant` with stop context + current time/season injected
3. Pass response text to ElevenLabs (Charlotte voice) → play back audio
4. While processing, show an animated waveform in the HUD
5. After playback, ghost-display transcript + response as an overlay for 5s then fade out

### Exit
- X button top-right
- Fade out all audio over 1s, stop ambient loop, restore app UI

---

## Acceptance Criteria
- [ ] On branch `ethan2`
- [ ] Drawer opens on marker/stop click with correct stop data
- [ ] Street View renders full-screen with no default UI
- [ ] Mapbox fallback renders for stops without Street View coverage
- [ ] Ambient audio auto-plays on load, matched to stop type
- [ ] AI intro narration auto-plays via ElevenLabs on load
- [ ] 🔴 Live HUD shows while narration plays
- [ ] Time of day toggle changes filter + audio + re-triggers narration
- [ ] Season toggle changes filter + re-triggers narration
- [ ] Mic Q&A captures voice, gets AI response, plays back via ElevenLabs
- [ ] X exits cleanly with audio fade
