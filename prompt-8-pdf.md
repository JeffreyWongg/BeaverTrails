# Prompt 8 — PDF Export

## Branch
Ensure you are on `ethan2` before making any changes.

## Overview
Using `@react-pdf/renderer`, build a `TripPDF` component that generates a downloadable itinerary PDF. Triggered by the "Export PDF" button on `/checkout`.

---

## TripPDF Component — `/components/TripPDF.tsx`

Build using `@react-pdf/renderer` primitives (`Document`, `Page`, `View`, `Text`, `Image`, `Link`).

### Styling
- Headers: red `#CC0000`
- Body font: Helvetica (react-pdf built-in)
- Every page: 5% opacity maple leaf watermark as a large light-red `Text` element positioned absolutely

---

## Pages

### Page 1 — Cover
- BeaverTrails logo (styled text is fine)
- Trip title, date range, list of provinces visited, estimated cost range
- Static Mapbox map image of the full route:
  ```
  https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/[encoded-geojson]/auto/900x400?access_token=MAPBOX_TOKEN
  ```
  Encode the route as a GeoJSON LineString through all stop coordinates

### Pages 2–N — One Page Per Day
- Day number header, city, province
- Each stop: name, type, address, estimated cost, notes
- Overnight hotel details, drive time from previous city
- For stops where `streetViewCoverage[stop.id] === true`, include a Google Street View Static API thumbnail:
  ```
  https://maps.googleapis.com/maps/api/streetview?size=400x200&location=[lat],[lng]&key=GOOGLE_MAPS_KEY
  ```

### Packing List Page
- 2-column layout organized by the 6 categories from Prompt 7

### Emergency Contacts Page
- Parks Canada: 1-888-773-8888
- CAA Roadside: 1-800-222-4357
- Hardcode a lookup map of provincial/territorial tourism board numbers for all 13 provinces and territories; include only the ones present in the itinerary

### Final Page — QR Code
- Use `qrcode.react` to generate a QR code linking to `/trip?id=[trip.id]`
- To embed in react-pdf: draw the QR to a canvas, convert to a data URL, pass to `<Image>`

---

## Wiring the Export Button

In `/app/checkout/page.tsx`:
```typescript
import { pdf } from "@react-pdf/renderer";

async function handleExport() {
  const blob = await pdf(
    <TripPDF
      trip={trip}
      streetViewCoverage={streetViewCoverage}
      packingList={packingList}
      costEstimates={costEstimates}
    />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `beavertrails-${trip.title.toLowerCase().replace(/\s+/g, "-")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## Acceptance Criteria
- [ ] On branch `ethan2`
- [ ] "Export PDF" triggers a browser download named `beavertrails-[trip-title].pdf`
- [ ] Cover page includes Mapbox static map image
- [ ] Each day has its own page with all stops and hotel
- [ ] Street View thumbnails appear for stops with coverage
- [ ] Packing list and emergency contacts pages are present
- [ ] QR code on final page links to the correct trip URL
- [ ] Maple leaf watermark appears on every page at low opacity
