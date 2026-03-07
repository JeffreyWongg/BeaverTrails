/**
 * Globe Component Render Tests
 *
 * Validates that the Globe & HeroGlobe components render without crashing.
 * Since WebGL isn't available in jsdom, we mock react-globe.gl and verify
 * that our components pass the correct props to it.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

// ─────────────────────────────────────────────────
// Mock react-globe.gl (WebGL not available in jsdom)
// ─────────────────────────────────────────────────

const mockPointOfView = vi.fn();
const mockGlobeMaterial = vi.fn(() => ({
  color: { set: vi.fn() },
  emissive: { set: vi.fn() },
  emissiveIntensity: 0,
  shininess: 0,
}));
const mockScene = vi.fn(() => ({
  children: [
    { type: "DirectionalLight", intensity: 1 },
    { type: "AmbientLight", intensity: 1 },
  ],
}));

vi.mock("react-globe.gl", () => {
  const GlobeMock = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
    // Expose mock methods via ref
    React.useImperativeHandle(ref, () => ({
      pointOfView: mockPointOfView,
      globeMaterial: mockGlobeMaterial,
      scene: mockScene,
    }));

    // Call onGlobeReady after mount
    React.useEffect(() => {
      const onReady = props.onGlobeReady as (() => void) | undefined;
      if (onReady) {
        onReady();
      }
    }, []);

    return React.createElement("div", {
      "data-testid": "globe-mock",
      "data-width": props.width,
      "data-height": props.height,
      "data-background-color": props.backgroundColor,
      "data-show-atmosphere": props.showAtmosphere,
      "data-atmosphere-color": props.atmosphereColor,
      "data-polygons-count": Array.isArray(props.polygonsData)
        ? (props.polygonsData as unknown[]).length
        : 0,
      "data-rings-count": Array.isArray(props.ringsData)
        ? (props.ringsData as unknown[]).length
        : 0,
      "data-globe-image-url": props.globeImageUrl,
      "data-ring-color":
        typeof props.ringColor === "function"
          ? (props.ringColor as () => string)()
          : props.ringColor,
    });
  });
  GlobeMock.displayName = "GlobeMock";
  return { default: GlobeMock };
});

// ─────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────

import GlobeComponent from "../components/Globe";

describe("GlobeComponent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch to return valid TopoJSON-like data
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: "Topology",
        objects: {
          countries: {
            type: "GeometryCollection",
            geometries: [
              {
                type: "MultiPolygon",
                id: "124",
                properties: { name: "Canada" },
                arcs: [[[0]]],
              },
            ],
          },
        },
        arcs: [[[-141, 60], [-60, 60], [-60, 42], [-141, 42]]],
      }),
    });
  });

  it("renders without crashing", () => {
    const { container } = render(<GlobeComponent width={800} height={800} />);
    expect(container).toBeDefined();
  });

  it("renders the globe mock element", () => {
    render(<GlobeComponent width={800} height={800} />);
    const globe = screen.getByTestId("globe-mock");
    expect(globe).toBeInTheDocument();
  });

  it("passes correct dimensions to Globe", () => {
    render(<GlobeComponent width={1000} height={900} />);
    const globe = screen.getByTestId("globe-mock");
    expect(globe.getAttribute("data-width")).toBe("1000");
    expect(globe.getAttribute("data-height")).toBe("900");
  });

  it("uses transparent background", () => {
    render(<GlobeComponent width={800} height={800} />);
    const globe = screen.getByTestId("globe-mock");
    expect(globe.getAttribute("data-background-color")).toBe("rgba(0,0,0,0)");
  });

  it("enables atmosphere with blue tint", () => {
    render(<GlobeComponent width={800} height={800} />);
    const globe = screen.getByTestId("globe-mock");
    expect(globe.getAttribute("data-show-atmosphere")).toBe("true");
    expect(globe.getAttribute("data-atmosphere-color")).toBe("#3a9ad9");
  });

  it("passes ring data for 4 Canadian cities", () => {
    render(<GlobeComponent width={800} height={800} />);
    const globe = screen.getByTestId("globe-mock");
    expect(globe.getAttribute("data-rings-count")).toBe("4");
  });

  it("uses correct earth-dark globe texture URL", () => {
    render(<GlobeComponent width={800} height={800} />);
    const globe = screen.getByTestId("globe-mock");
    expect(globe.getAttribute("data-globe-image-url")).toContain("earth-dark.jpg");
  });

  it("ringColor accessor returns valid rgba (no NaN)", () => {
    render(<GlobeComponent width={800} height={800} />);
    const globe = screen.getByTestId("globe-mock");
    const ringColor = globe.getAttribute("data-ring-color");
    expect(ringColor).toBe("rgba(64, 180, 220, 0.6)");
    expect(ringColor).not.toContain("NaN");
  });

  it("sets camera to Canada coordinates on globe ready", async () => {
    render(<GlobeComponent width={800} height={800} />);

    await waitFor(() => {
      expect(mockPointOfView).toHaveBeenCalledWith(
        { lat: 56, lng: -106, altitude: 2.0 },
        0
      );
    });
  });

  it("customizes globe material on ready", async () => {
    render(<GlobeComponent width={800} height={800} />);

    await waitFor(() => {
      expect(mockGlobeMaterial).toHaveBeenCalled();
    });
  });

  it("fetches TopoJSON data on mount", async () => {
    render(<GlobeComponent width={800} height={800} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
      );
    });
  });

  it("uses default dimensions (800x800) when not provided", () => {
    render(<GlobeComponent />);
    const globe = screen.getByTestId("globe-mock");
    expect(globe.getAttribute("data-width")).toBe("800");
    expect(globe.getAttribute("data-height")).toBe("800");
  });

  it("adjusts lighting for moodier look on globe ready", async () => {
    render(<GlobeComponent width={800} height={800} />);

    await waitFor(() => {
      expect(mockScene).toHaveBeenCalled();
    });
  });
});
