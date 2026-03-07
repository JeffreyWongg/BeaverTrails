# Prompt 6 — AI Trip Assistant Chat

## Branch
Ensure you are on `ethan2` before making any changes.

## Overview
A floating chat panel that slides up from the bottom-right. Streams responses using the existing OpenRouter setup with the full itinerary as context. Supports optional voice playback via ElevenLabs. Can programmatically trigger the ImmersiveDrawer with a specific time/season pre-set.

---

## API Route — `POST /api/trip-assistant`

Accepts: `{ messages, trip, travelerProfile }`

- Use the existing OpenRouter helper and model already in the codebase — do not introduce a new one
- System prompt injects the full serialized `trip` JSON and `travelerProfile`
- Persona: warm, knowledgeable Canadian guide. Never says "Great question!". Occasionally uses Canadian expressions naturally. Keeps responses concise enough to be spoken aloud in under 30 seconds when voice mode is active.
- Stream the response back as `text/event-stream`

---

## TripAssistant Component

### Layout
- Floating panel, 400px wide, slides up from bottom-right via Framer Motion
- High z-index, sits above the map
- Toggled by the existing 💬 floating button on `/trip`

### Behaviour
- Maintain `messages` array in local state
- On send: append user message, POST to `/api/trip-assistant` with full history + trip + profile, stream tokens into the assistant message with a blinking cursor
- On first open, show 4 starter chips:
  - "What should I pack for this trip?"
  - "Which stop is most kid-friendly?"
  - "What's the best season for this route?"
  - "Are there any permit requirements I should know about?"

### Voice Toggle
- 🔊 toggle in the panel header
- When enabled: after each response finishes streaming, POST text to `/api/speak` → ElevenLabs Charlotte voice → play back in panel
- Show animated waveform next to the message while audio plays

### ImmersiveDrawer Intent Detection
After each user message, check for patterns like:
- "what does [X] look like at night"
- "show me [X] in winter"
- "what is [X] like in summer"

If matched: find the stop by fuzzy name, open `ImmersiveDrawer` for it, and pre-activate the matching time-of-day or season toggle from Prompt 5.

---

## Acceptance Criteria
- [ ] On branch `ethan2`
- [ ] Panel slides up/down smoothly
- [ ] Starter chips send as messages when clicked
- [ ] Tokens stream in real time with blinking cursor
- [ ] Full trip JSON and traveller profile present in every API call
- [ ] Voice toggle plays ElevenLabs audio after each response
- [ ] Intent detection triggers ImmersiveDrawer with correct mode pre-set
