# Prompt 7 — Checkout, Swap & Cost Breakdown

## Branch
Ensure you are on `ethan2` before making any changes.

## Overview
A `/checkout` page reachable from a "Finalize Trip" button on `/trip`. Shows the full itinerary timeline with swappable stops, a live cost breakdown table, group size stepper, and an AI packing list.

---

## API Routes Needed

### `POST /api/swap-stop`
Accepts: `{ currentStop, userSuggestion, neighbouringStops, travelerProfile }`

- Use the existing OpenRouter helper and model in the codebase
- Return a replacement stop matching the existing `Stop` type shape
- After swap, re-run the Street View availability check for the new stop's coordinates and update Zustand `streetViewCoverage`

### `POST /api/estimate-costs`
Accepts: `{ trip, groupSize }`

- Use the existing OpenRouter setup
- Return a `CostEstimate[]` array (one per day) with: `accommodationLow`, `accommodationHigh`, `foodLow`, `foodHigh`, `transport`, `activities`
- Base estimates on the trip's `budgetTier` and `groupSize`
- Return JSON only

### `POST /api/packing-list`
Accepts: `{ trip, travelerProfile }`

- Use the existing OpenRouter setup
- Return a packing list as JSON: `{ category: string, items: string[] }[]` across 6 categories: Clothing, Gear & Outdoors, Documents & Money, Health & Safety, Tech & Entertainment, Misc

---

## Checkout Page — `/app/checkout/page.tsx`

### Section 1 — Itinerary Timeline
- One card per day, collapsible, showing city, province, drive time, and all stops
- Each stop card has an ✏️ edit icon that opens a `SwapModal`
- SwapModal: free-text input "What would you prefer instead?" → POST to `/api/swap-stop` → animate swap in-place with Framer Motion `layout` → re-run Street View check for new stop

### Section 2 — Cost Breakdown Table
- Call `/api/estimate-costs` on page load with `groupSize = 1`
- Striped table: Day / Accommodation / Food / Transport / Activities / Day Total
- Show low–high ranges for accommodation and food
- Final row: trip total range
- Rescales live when group size changes

### Section 3 — Group Size Stepper
- +/- stepper, range 1–12
- On change: re-call `/api/estimate-costs` and re-render the cost table

### Section 4 — AI Packing List
- Call `/api/packing-list` on page load
- Render as 6 collapsible accordions, one per category

### Section 5 — Export PDF Button
- "Export PDF 📄" button — wired up in Prompt 8

---

## Acceptance Criteria
- [ ] On branch `ethan2`
- [ ] "Finalize Trip" on `/trip` navigates to `/checkout`
- [ ] All days and stops render in the timeline
- [ ] SwapModal opens, submits, and animates the replacement stop in place
- [ ] Street View re-check runs for swapped stops
- [ ] Cost table renders with correct low/high ranges
- [ ] Group size stepper rescales costs live
- [ ] Packing list renders in 6 collapsible accordions
- [ ] "Export PDF" button is present (functional in Prompt 8)
