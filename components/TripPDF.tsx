import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
  StyleSheet,
  type DocumentProps,
} from "@react-pdf/renderer";
import { Trip, CostEstimate, Stop } from "../types";
import { PackingCategory } from "../app/api/packing-list/route";

// Provincial tourism board numbers — hardcoded lookup
const PROVINCIAL_NUMBERS: Record<string, string> = {
  "British Columbia": "1-800-435-5622",
  Alberta: "1-800-252-3782",
  Saskatchewan: "1-877-237-2273",
  Manitoba: "1-800-665-0040",
  Ontario: "1-800-668-2746",
  Quebec: "1-877-266-5687",
  "New Brunswick": "1-800-561-0123",
  "Nova Scotia": "1-800-565-0000",
  "Prince Edward Island": "1-800-463-4734",
  "Newfoundland and Labrador": "1-800-563-6353",
  "Northwest Territories": "1-800-661-0788",
  Nunavut: "1-866-686-2888",
  Yukon: "1-800-661-0494",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    position: "relative",
  },
  watermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(-30deg)",
    fontSize: 80,
    color: "#ffcccc",
    opacity: 0.05,
    zIndex: -1,
  },
  // Cover
  coverTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#CC0000",
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  coverSubtitle: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 24,
  },
  coverMeta: {
    fontSize: 11,
    color: "#333333",
    marginBottom: 4,
  },
  mapImage: {
    width: "100%",
    height: 220,
    objectFit: "cover",
    borderRadius: 6,
    marginTop: 16,
  },
  // Day pages
  dayHeader: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#CC0000",
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  dayMeta: {
    fontSize: 10,
    color: "#999999",
    marginBottom: 16,
  },
  stopCard: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eeeeee",
    borderRadius: 4,
    padding: 10,
  },
  stopName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111111",
    marginBottom: 2,
    fontFamily: "Helvetica-Bold",
  },
  stopType: {
    fontSize: 9,
    color: "#CC0000",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  stopDesc: {
    fontSize: 9,
    color: "#666666",
    lineHeight: 1.4,
  },
  stopCost: {
    fontSize: 9,
    color: "#009900",
    marginTop: 2,
  },
  streetViewThumb: {
    width: "100%",
    height: 100,
    objectFit: "cover",
    borderRadius: 3,
    marginTop: 6,
  },
  hotelBlock: {
    marginTop: 12,
    padding: 8,
    backgroundColor: "#fff8f0",
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#ff9900",
  },
  hotelLabel: {
    fontSize: 8,
    color: "#cc7700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  hotelName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#994400",
    fontFamily: "Helvetica-Bold",
  },
  travelInfo: {
    fontSize: 9,
    color: "#888888",
    fontStyle: "italic",
    marginBottom: 12,
  },
  // Section headers
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#CC0000",
    marginBottom: 12,
    fontFamily: "Helvetica-Bold",
    borderBottomWidth: 1,
    borderBottomColor: "#ffcccc",
    paddingBottom: 4,
  },
  // Packing list
  packingRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 16,
  },
  packingCategoryTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#CC0000",
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  packingItem: {
    fontSize: 9,
    color: "#333333",
    marginBottom: 2,
  },
  // Emergency contacts
  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  contactName: {
    fontSize: 11,
    color: "#222222",
  },
  contactNumber: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#CC0000",
    fontFamily: "Helvetica-Bold",
  },
  // QR code page
  qrContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#CC0000",
    marginBottom: 8,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  qrSub: {
    fontSize: 10,
    color: "#888888",
    textAlign: "center",
    marginBottom: 20,
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#cccccc",
    textAlign: "center",
  },
});

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

function getStopKey(stop: Stop): string {
  return (
    stop.id ||
    `${stop.name}_${stop.coordinates[0].toFixed(4)}_${stop.coordinates[1].toFixed(4)}`
  );
}

function Watermark() {
  return (
    <Text style={styles.watermark}>🍁</Text>
  );
}

interface TripPDFProps {
  trip: Trip & { days: Trip["days"] };
  streetViewCoverage: Record<string, boolean>;
  packingList: PackingCategory[];
  costEstimates: CostEstimate[];
  qrDataUrl?: string;
}

export function TripPDF({
  trip,
  streetViewCoverage,
  packingList,
  costEstimates,
  qrDataUrl,
}: TripPDFProps): React.ReactElement<DocumentProps> {
  const provinces = Array.from(new Set(trip.days.map((d) => d.province)));

  const totalLow = costEstimates.reduce(
    (s, r) => s + r.accommodationLow + r.foodLow + r.transport + r.activities,
    0
  );
  const totalHigh = costEstimates.reduce(
    (s, r) => s + r.accommodationHigh + r.foodHigh + r.transport + r.activities,
    0
  );

  // Build Mapbox static route map URL
  const allCoords = trip.days.map((d) => d.city_coordinates).filter(Boolean);
  const routeMapUrl = (() => {
    if (!MAPBOX_TOKEN || allCoords.length < 2) return null;
    try {
      const geojson = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: allCoords,
            },
            properties: {},
          },
        ],
      };
      const encoded = encodeURIComponent(JSON.stringify(geojson));
      return `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/geojson(${encoded})/auto/900x400?padding=60&access_token=${MAPBOX_TOKEN}`;
    } catch {
      return null;
    }
  })();

  const stopIcon = (type: string) => {
    switch (type) {
      case "park": return "🌲 ";
      case "restaurant": return "🍽 ";
      case "attraction": return "📸 ";
      case "hotel": return "🏨 ";
      case "airport": return "✈ ";
      default: return "📍 ";
    }
  };

  const travelLabel = (method: string, hours: number) => {
    if (!hours) return null;
    const icons: Record<string, string> = {
      flight: "✈ Flight",
      drive: "🚗 Drive",
      train: "🚆 Train",
      boat: "⛴ Boat",
    };
    return `${icons[method] || "Travel"} — ${hours}h from previous city`;
  };

  return (
    <Document>
      {/* ─── PAGE 1: COVER ─── */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <Text style={styles.coverTitle}>🦫 BeaverTrails</Text>
        <Text style={styles.coverSubtitle}>{trip.title}</Text>

        <Text style={styles.coverMeta}>
          {trip.days.length}-day journey across {provinces.join(", ")}
        </Text>
        {costEstimates.length > 0 && (
          <Text style={styles.coverMeta}>
            Estimated cost: ${Math.round(totalLow)}–${Math.round(totalHigh)} CAD per person
          </Text>
        )}
        <Text style={styles.coverMeta}>
          Crafted for: {trip.travellerProfile || "Canadian Adventurer"}
        </Text>

        {routeMapUrl && (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={routeMapUrl} style={styles.mapImage} />
        )}

        <Text style={styles.footer}>
          Generated by BeaverTrails — beavertrails.app
        </Text>
      </Page>

      {/* ─── PAGES 2–N: ONE PER DAY ─── */}
      {trip.days.map((day) => (
        <Page key={day.date_offset} size="A4" style={styles.page}>
          <Watermark />

          <Text style={styles.dayHeader}>
            Day {day.date_offset} — {day.city}
          </Text>
          <Text style={styles.dayMeta}>
            {day.province}
            {day.overnight_hotel ? ` · Stay: ${day.overnight_hotel}` : ""}
          </Text>

          {day.travel_time_from_prev_hours > 0 && (
            <Text style={styles.travelInfo}>
              {travelLabel(day.travel_method_from_prev, day.travel_time_from_prev_hours)}
            </Text>
          )}

          {day.airport && (
            <Text style={{ fontSize: 10, color: "#3366cc", marginBottom: 8 }}>
              ✈ {day.airport.name}
            </Text>
          )}

          {(day.stops || []).map((stop, i) => {
            const key = getStopKey(stop);
            const hasSV = streetViewCoverage[key] === true;
            const svThumbUrl =
              hasSV && GOOGLE_MAPS_KEY && !GOOGLE_MAPS_KEY.startsWith("TODO")
                ? `https://maps.googleapis.com/maps/api/streetview?size=400x200&location=${stop.coordinates[1]},${stop.coordinates[0]}&key=${GOOGLE_MAPS_KEY}`
                : null;

            return (
              <View key={i} style={styles.stopCard} wrap={false}>
                <Text style={styles.stopType}>
                  {stopIcon(stop.type)}{stop.type.toUpperCase()}
                </Text>
                <Text style={styles.stopName}>{stop.name}</Text>
                {stop.description && (
                  <Text style={styles.stopDesc}>{stop.description}</Text>
                )}
                {stop.address && (
                  <Text style={{ fontSize: 9, color: "#888888", marginTop: 2 }}>
                    📍 {stop.address}
                  </Text>
                )}
                {stop.estimatedCost && (
                  <Text style={styles.stopCost}>💰 {stop.estimatedCost}</Text>
                )}
                {svThumbUrl && (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image src={svThumbUrl} style={styles.streetViewThumb} />
                )}
              </View>
            );
          })}

          {day.overnight_hotel && (
            <View style={styles.hotelBlock} wrap={false}>
              <Text style={styles.hotelLabel}>OVERNIGHT STAY</Text>
              <Text style={styles.hotelName}>🛏 {day.overnight_hotel}</Text>
            </View>
          )}

          <Text style={styles.footer}>
            BeaverTrails — Day {day.date_offset} of {trip.days.length}
          </Text>
        </Page>
      ))}

      {/* ─── PACKING LIST PAGE ─── */}
      {packingList.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Watermark />
          <Text style={styles.sectionHeader}>Packing List</Text>

          {/* 2-column layout */}
          {Array.from({ length: Math.ceil(packingList.length / 2) }).map((_, rowIdx) => {
            const left = packingList[rowIdx * 2];
            const right = packingList[rowIdx * 2 + 1];
            return (
              <View key={rowIdx} style={styles.packingRow}>
                {left && (
                  <View style={{ flex: 1 }}>
                    <Text style={styles.packingCategoryTitle}>{left.category}</Text>
                    {left.items.map((item, i) => (
                      <Text key={i} style={styles.packingItem}>
                        • {item}
                      </Text>
                    ))}
                  </View>
                )}
                {right && (
                  <View style={{ flex: 1 }}>
                    <Text style={styles.packingCategoryTitle}>{right.category}</Text>
                    {right.items.map((item, i) => (
                      <Text key={i} style={styles.packingItem}>
                        • {item}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          <Text style={styles.footer}>BeaverTrails — Packing List</Text>
        </Page>
      )}

      {/* ─── EMERGENCY CONTACTS PAGE ─── */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <Text style={styles.sectionHeader}>Emergency Contacts</Text>

        {/* National contacts */}
        <View style={styles.contactRow}>
          <Text style={styles.contactName}>Parks Canada (24h emergency)</Text>
          <Text style={styles.contactNumber}>1-888-773-8888</Text>
        </View>
        <View style={styles.contactRow}>
          <Text style={styles.contactName}>CAA Roadside Assistance</Text>
          <Text style={styles.contactNumber}>1-800-222-4357</Text>
        </View>
        <View style={{ marginTop: 12, marginBottom: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: "bold", color: "#CC0000", fontFamily: "Helvetica-Bold" }}>
            Provincial Tourism Boards
          </Text>
        </View>

        {/* Only provinces present in the itinerary */}
        {Array.from(new Set(trip.days.map((d) => d.province)))
          .filter((p) => PROVINCIAL_NUMBERS[p])
          .map((province) => (
            <View key={province} style={styles.contactRow}>
              <Text style={styles.contactName}>{province} Tourism</Text>
              <Text style={styles.contactNumber}>{PROVINCIAL_NUMBERS[province]}</Text>
            </View>
          ))}

        <Text style={styles.footer}>BeaverTrails — Emergency Contacts</Text>
      </Page>

      {/* ─── QR CODE PAGE ─── */}
      <Page size="A4" style={styles.page}>
        <Watermark />
        <View style={styles.qrContainer}>
          <Text style={styles.qrTitle}>View Your Trip Online</Text>
          <Text style={styles.qrSub}>
            Scan to open your interactive itinerary at BeaverTrails
          </Text>
          {qrDataUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={qrDataUrl} style={styles.qrImage} />
          ) : (
            <View style={{ width: 180, height: 180, backgroundColor: "#f5f5f5", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 10, color: "#888888" }}>QR code unavailable</Text>
            </View>
          )}
          <Text style={{ fontSize: 10, color: "#888888", marginTop: 12, textAlign: "center" }}>
            beavertrails.app/trip?id={trip.id}
          </Text>
          <Link
            src={`https://beavertrails.app/trip?id=${trip.id}`}
            style={{ fontSize: 10, color: "#CC0000", marginTop: 4, textAlign: "center" }}
          >
            beavertrails.app/trip?id={trip.id}
          </Link>
        </View>
        <Text style={styles.footer}>BeaverTrails — beavertrails.app</Text>
      </Page>
    </Document>
  );
}
