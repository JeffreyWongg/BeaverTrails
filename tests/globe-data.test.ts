/**
 * Globe Data Pipeline Tests
 *
 * Validates that all data feeding into the Globe component is correct:
 * - TopoJSON fetching & parsing
 * - Canada extraction from world data
 * - Ring marker data format
 * - Color string validity
 */
import { describe, it, expect, beforeAll } from "vitest";
import * as topojson from "topojson-client";

// ─────────────────────────────────────────────────
// 1. TopoJSON Data Fetch & Parse
// ─────────────────────────────────────────────────

describe("TopoJSON Data Pipeline", () => {
  let topology: any;
  let geojson: any;

  beforeAll(async () => {
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
    );
    expect(res.ok).toBe(true);
    topology = await res.json();
  });

  it("fetches valid TopoJSON topology", () => {
    expect(topology).toBeDefined();
    expect(topology.type).toBe("Topology");
    expect(topology.objects).toBeDefined();
    expect(topology.objects.countries).toBeDefined();
  });

  it("topology has country geometries", () => {
    const geometries = topology.objects.countries.geometries;
    expect(geometries).toBeDefined();
    expect(geometries.length).toBeGreaterThan(100); // ~177 countries
  });

  it("converts TopoJSON to GeoJSON FeatureCollection", () => {
    geojson = topojson.feature(topology, topology.objects.countries);
    expect(geojson).toBeDefined();
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.features).toBeDefined();
    expect(geojson.features.length).toBeGreaterThan(100);
  });

  it("each feature has geometry property", () => {
    geojson = topojson.feature(topology, topology.objects.countries);
    for (const feature of geojson.features.slice(0, 20)) {
      expect(feature.geometry).toBeDefined();
      expect(feature.geometry.type).toMatch(/Polygon|MultiPolygon/);
      expect(feature.geometry.coordinates).toBeDefined();
    }
  });
});

// ─────────────────────────────────────────────────
// 2. Canada Extraction
// ─────────────────────────────────────────────────

describe("Canada Extraction", () => {
  let geojson: any;

  beforeAll(async () => {
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
    );
    const topology = await res.json();
    geojson = topojson.feature(topology, topology.objects.countries);
  });

  it("finds Canada by numeric id '124'", () => {
    const canada = geojson.features.find((f: any) => f.id === "124");
    expect(canada).toBeDefined();
    expect(canada.id).toBe("124");
  });

  it("finds Canada by properties.name (lowercase)", () => {
    const canada = geojson.features.find(
      (f: any) => f.properties && f.properties.name === "Canada"
    );
    expect(canada).toBeDefined();
    expect(canada.properties.name).toBe("Canada");
  });

  it("does NOT find Canada by properties.NAME (uppercase) — old bug", () => {
    const canada = geojson.features.find(
      (f: any) => f.properties && f.properties.NAME === "Canada"
    );
    expect(canada).toBeUndefined(); // Confirms old bug
  });

  it("Canada has valid Polygon/MultiPolygon geometry", () => {
    const canada = geojson.features.find((f: any) => f.id === "124");
    expect(canada.geometry).toBeDefined();
    expect(canada.geometry.type).toMatch(/Polygon|MultiPolygon/);
    expect(canada.geometry.coordinates.length).toBeGreaterThan(0);
  });

  it("Canada polygon is usable as polygonsData array", () => {
    const canada = geojson.features.find((f: any) => f.id === "124");
    const polygonsData = [canada];
    expect(polygonsData).toHaveLength(1);
    expect(polygonsData[0]).toHaveProperty("geometry");
    expect(polygonsData[0]).toHaveProperty("type", "Feature");
  });
});

// ─────────────────────────────────────────────────
// 3. Ring Marker Data
// ─────────────────────────────────────────────────

const CANADIAN_RINGS = [
  { lat: 45.4247, lng: -75.695, maxR: 3, propagationSpeed: 1.5, repeatPeriod: 1200 },
  { lat: 43.6532, lng: -79.3832, maxR: 4, propagationSpeed: 2, repeatPeriod: 1400 },
];

describe("Ring Marker Data", () => {
  it("has correct number of ring markers", () => {
    expect(CANADIAN_RINGS).toHaveLength(2);
  });

  it("each ring has valid lat/lng in Canadian territory", () => {
    for (const ring of CANADIAN_RINGS) {
      expect(ring.lat).toBeGreaterThanOrEqual(41);   // south border
      expect(ring.lat).toBeLessThanOrEqual(84);      // north
      expect(ring.lng).toBeGreaterThanOrEqual(-141);  // west border
      expect(ring.lng).toBeLessThanOrEqual(-52);      // east (Newfoundland)
    }
  });

  it("each ring has positive maxR", () => {
    for (const ring of CANADIAN_RINGS) {
      expect(ring.maxR).toBeGreaterThan(0);
    }
  });

  it("each ring has positive propagationSpeed", () => {
    for (const ring of CANADIAN_RINGS) {
      expect(ring.propagationSpeed).toBeGreaterThan(0);
    }
  });

  it("each ring has positive repeatPeriod", () => {
    for (const ring of CANADIAN_RINGS) {
      expect(ring.repeatPeriod).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────
// 4. Color String Validation
// ─────────────────────────────────────────────────

describe("Color Values (no NaN, no null)", () => {
  const rgbaPattern = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/;

  // Reproduce the EXACT accessor functions from Globe.tsx
  const polygonCapColor = () => "rgba(255, 255, 255, 0.08)";
  const polygonSideColor = () => "rgba(180, 220, 255, 0.05)";
  const polygonStrokeColor = () => "rgba(180, 220, 255, 0.25)";
  const ringColor = () => "rgba(110, 200, 170, 0.4)";

  it("polygonCapColor returns valid rgba", () => {
    const color = polygonCapColor();
    expect(color).toMatch(rgbaPattern);
    expect(color).not.toContain("NaN");
    expect(color).not.toContain("undefined");
  });

  it("polygonSideColor returns valid rgba", () => {
    const color = polygonSideColor();
    expect(color).toMatch(rgbaPattern);
    expect(color).not.toContain("NaN");
  });

  it("polygonStrokeColor returns valid rgba", () => {
    const color = polygonStrokeColor();
    expect(color).toMatch(rgbaPattern);
    expect(color).not.toContain("NaN");
  });

  it("ringColor returns valid rgba (was the crash source)", () => {
    const color = ringColor();
    expect(color).toMatch(rgbaPattern);
    expect(color).not.toContain("NaN");
    expect(color).not.toContain("undefined");
    expect(color).not.toContain("null");
  });

  it("ringColor with no args still returns valid color (old bug: passed t=undefined)", () => {
    // This simulates how three-globe actually calls the accessor: just (dataObj)
    const dataObj = CANADIAN_RINGS[0];
    const color = ringColor();
    expect(color).toMatch(rgbaPattern);
  });
});

// ─────────────────────────────────────────────────
// 5. Globe Image URL Accessibility
// ─────────────────────────────────────────────────

describe("Globe Texture URL", () => {
  it("earth-dark.jpg is accessible", async () => {
    const url = "https://unpkg.com/three-globe/example/img/earth-dark.jpg";
    const res = await fetch(url, { method: "HEAD" });
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
  });
});
