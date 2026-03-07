# Prompt 4b — Street View Badge Check

## Branch Setup
Before starting, check out or create the `ethan2` branch:
```bash
git checkout -b ethan2
# or if it already exists:
git checkout ethan2
```
All work in this and all subsequent prompts (5–8) should be committed to `ethan2`.

## Overview
After all markers are plotted on the `/trip` map, run a background Street View availability check for every stop. If coverage exists, add a 📷 badge to that marker. Cache results so the ImmersiveDrawer doesn't need to re-check.

## What to Build

### Street View Check Utility
Create a client-side helper that uses `google.maps.StreetViewService.getPanorama()` with a ~100m radius to check coverage for a given `{ lat, lng }`. Returns a boolean.

### Run Checks After Markers Load
After all stop markers are plotted, iterate over every stop across all days. For each stop, call the Street View utility. If coverage is found:
- Append a small `📷` badge element to that marker's existing HTML
- Store the result in the Zustand `streetViewCoverage` map keyed by `stop.id`

Run all checks in parallel (`Promise.all`) so it doesn't block the UI.

### Environment
Add `NEXT_PUBLIC_GOOGLE_MAPS_KEY` to `.env.local` with the Street View API enabled in Google Cloud Console. The Google Maps JS API script should already be loaded in the global layout.

## OpenRouter
Look at the existing codebase to find how OpenRouter is already configured (model, helper, API key) and follow the same pattern for any AI calls in this and all subsequent prompts. Do not introduce a new model or change the existing one.

## Acceptance Criteria
- [ ] Working on branch `ethan2`
- [ ] 📷 badges appear on markers with Street View coverage
- [ ] Zustand `streetViewCoverage` is populated after checks complete
- [ ] No visible UI blocking during checks
- [ ] ImmersiveDrawer can read `streetViewCoverage[stop.id]` without re-fetching
