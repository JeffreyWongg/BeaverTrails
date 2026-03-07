# BeaverTrails — Overnight Implementation

You are implementing the remaining features of BeaverTrails, a Next.js 14 Canadian trip planner app. The project is already built and running. Phases 1–4 are complete.

## First Steps
1. Read the existing codebase thoroughly before writing any code — understand the folder structure, how OpenRouter is configured, the existing types, Zustand store shape, and component patterns
2. Create and switch to branch `ethan2`:
   ```bash
   git checkout -b ethan2
   # or if it exists:
   git checkout ethan2
   ```
3. Run `npm run dev` and confirm the app starts without errors before touching anything

## Your Task
Implement Prompts 4b, 5, 6, 7, and 8 in order. Each has a dedicated spec file:

- `prompt-4b-streetview-badges.md`
- `prompt-5-immersive.md`
- `prompt-6-trip-assistant.md`
- `prompt-7-checkout.md`
- `prompt-8-pdf.md`

Read each spec file fully before starting that phase. Complete and verify each phase before moving to the next.

## Rules
- **Never change the existing OpenRouter configuration.** Find how it's set up in the codebase and follow the exact same pattern for all new AI calls
- **Never change any existing code from Phases 1–4** unless it's strictly required to wire in a new feature (e.g. adding a button that opens the ImmersiveDrawer)
- **All changes go on branch `ethan2`** — do not touch `main`
- If an `.env.local` variable is missing (e.g. `NEXT_PUBLIC_GOOGLE_MAPS_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_CHARLOTTE_VOICE_ID`), add it as a placeholder and leave a `TODO` comment — do not block progress on it
- If you hit a type error, fix it. If you hit a runtime error, debug it before moving on
- Keep the existing design language — dark theme, red accents, same component style as what's already there
- After completing all 5 phases, do a final `npm run build` and fix any build errors before stopping

## Commit Strategy
Commit after each phase is complete with a clear message, e.g.:
```bash
git add .
git commit -m "feat: phase 4b - street view badge check"
git commit -m "feat: phase 5 - immersive stop experience"
git commit -m "feat: phase 6 - trip assistant chat"
git commit -m "feat: phase 7 - checkout and cost breakdown"
git commit -m "feat: phase 8 - PDF export"
```

## Done When
- All 5 phases pass their acceptance criteria (listed at the bottom of each spec file)
- `npm run build` completes with no errors on branch `ethan2`
