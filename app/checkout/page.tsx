"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Loader2,
  FileDown,
  Package,
  DollarSign,
  Users,
  ArrowLeft,
} from "lucide-react";
import { useSurveyStore } from "../../lib/store";
import { Stop, Day, CostEstimate } from "../../types";
import { PackingCategory } from "../api/packing-list/route";
import { checkStreetViewCoverage, getStopKey } from "../../lib/streetView";

interface SwapModalProps {
  stop: Stop;
  dayIndex: number;
  stopIndex: number;
  neighbours: Stop[];
  onSwap: (dayIndex: number, stopIndex: number, newStop: Stop) => void;
  onClose: () => void;
  travelerProfile: string;
}

function SwapModal({
  stop,
  dayIndex,
  stopIndex,
  neighbours,
  onSwap,
  onClose,
  travelerProfile,
}: SwapModalProps) {
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSwap = async () => {
    if (!suggestion.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/swap-stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStop: stop,
          userSuggestion: suggestion,
          neighbouringStops: neighbours,
          travelerProfile,
        }),
      });

      const newStop: Stop = await res.json();
      if (newStop.name) {
        onSwap(dayIndex, stopIndex, newStop);
        onClose();
      } else {
        setError("Couldn't find a replacement. Try a different suggestion.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <h3 className="text-lg font-bold text-white mb-1">Swap Stop</h3>
        <p className="text-sm text-zinc-400 mb-4">
          Replacing: <span className="text-white font-medium">{stop.name}</span>
        </p>

        <textarea
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          placeholder="What would you prefer instead? e.g. 'A brewery tour' or 'Something more family-friendly'"
          rows={3}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-700/60 resize-none mb-4"
        />

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSwap}
            disabled={loading || !suggestion.trim()}
            className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {loading ? "Finding…" : "Swap Stop"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { itinerary, travellerArchetype, budgetPerPerson, streetViewCoverage, setField } =
    useSurveyStore();

  const [days, setDays] = useState<Day[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([0]));
  const [swapModal, setSwapModal] = useState<{
    stop: Stop;
    dayIndex: number;
    stopIndex: number;
  } | null>(null);

  const [costEstimates, setCostEstimates] = useState<CostEstimate[]>([]);
  const [costsLoading, setCostsLoading] = useState(false);
  const [groupSize, setGroupSize] = useState(1);

  const [packingList, setPackingList] = useState<PackingCategory[]>([]);
  const [packingLoading, setPackingLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const [exportLoading, setExportLoading] = useState(false);

  const trip = {
    id: "current-trip",
    title: "My BeaverTrails Trip",
    days,
    travellerProfile: travellerArchetype || "",
    totalCostEstimate: 0,
    budgetTier: budgetPerPerson || "mid-range",
  };

  // Initialize days from itinerary
  useEffect(() => {
    if (itinerary && itinerary.length > 0) {
      setDays([...itinerary]);
    }
  }, [itinerary]);

  // Fetch cost estimates
  const fetchCosts = useCallback(
    async (size: number) => {
      if (!days.length) return;
      setCostsLoading(true);
      try {
        const res = await fetch("/api/estimate-costs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trip: { ...trip, days }, groupSize: size }),
        });
        const data: CostEstimate[] = await res.json();
        if (Array.isArray(data)) setCostEstimates(data);
      } catch {
        // silent
      } finally {
        setCostsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [days]
  );

  // Fetch packing list
  const fetchPackingList = useCallback(async () => {
    if (!days.length) return;
    setPackingLoading(true);
    try {
      const res = await fetch("/api/packing-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip: { ...trip, days }, travelerProfile: travellerArchetype }),
      });
      const data: PackingCategory[] = await res.json();
      if (Array.isArray(data)) setPackingList(data);
    } catch {
      // silent
    } finally {
      setPackingLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  useEffect(() => {
    if (days.length > 0) {
      fetchCosts(groupSize);
      fetchPackingList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.length]);

  const handleGroupSizeChange = (delta: number) => {
    const newSize = Math.max(1, Math.min(12, groupSize + delta));
    setGroupSize(newSize);
    fetchCosts(newSize);
  };

  const handleSwap = async (dayIndex: number, stopIndex: number, newStop: Stop) => {
    const newDays = [...days];
    newDays[dayIndex] = {
      ...newDays[dayIndex],
      stops: newDays[dayIndex].stops.map((s, i) => (i === stopIndex ? newStop : s)),
    };
    setDays(newDays);
    setField("itinerary", newDays);

    // Re-check Street View for the new stop
    const [lng, lat] = newStop.coordinates;
    const hasCoverage = await checkStreetViewCoverage(lat, lng);
    const key = getStopKey(newStop);
    setField("streetViewCoverage", { ...streetViewCoverage, [key]: hasCoverage });
  };

  const handleExportPDF = async () => {
    if (!days.length) return;
    setExportLoading(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { TripPDF } = await import("../../components/TripPDF");

      let qrDataUrl = "";
      try {
        const QRCode = await import("qrcode");
        qrDataUrl = await QRCode.default.toDataURL(
          `https://beavertrails.app/trip?id=${trip.id}`
        );
      } catch {
        // QR code generation failed, continue without it
      }

      const blob = await pdf(
        TripPDF({
          trip: { ...trip, days },
          streetViewCoverage,
          packingList,
          costEstimates,
          qrDataUrl,
        })
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `beavertrails-${trip.title.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExportLoading(false);
    }
  };

  // Calculate totals
  const totalLow =
    costEstimates.reduce(
      (sum, d) => sum + d.accommodationLow + d.foodLow + d.transport + d.activities,
      0
    ) * groupSize;
  const totalHigh =
    costEstimates.reduce(
      (sum, d) => sum + d.accommodationHigh + d.foodHigh + d.transport + d.activities,
      0
    ) * groupSize;

  if (!itinerary || itinerary.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white">
        <p className="text-zinc-400 mb-4">No itinerary to finalize.</p>
        <button onClick={() => router.push("/")} className="text-red-400 underline">
          Start over
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/trip")}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-orange-300">
              Finalize Your Trip
            </h1>
            <p className="text-zinc-400 text-sm mt-0.5">
              Review, customize, and export your Canadian adventure
            </p>
          </div>
        </div>

        {/* Section 1: Itinerary Timeline */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-red-900/40 flex items-center justify-center text-red-400 text-sm font-bold">1</span>
            Itinerary
          </h2>
          <div className="space-y-3">
            {days.map((day, dayIdx) => (
              <div
                key={day.date_offset}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedDays((prev) => {
                      const next = new Set(prev);
                      if (next.has(dayIdx)) {
                        next.delete(dayIdx);
                      } else {
                        next.add(dayIdx);
                      }
                      return next;
                    })
                  }
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center font-bold text-red-400">
                      {day.date_offset}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white">{day.city}</p>
                      <p className="text-xs text-zinc-500">
                        {day.province} · {day.stops?.length || 0} stops
                      </p>
                    </div>
                  </div>
                  {expandedDays.has(dayIdx) ? (
                    <ChevronUp size={18} className="text-zinc-500" />
                  ) : (
                    <ChevronDown size={18} className="text-zinc-500" />
                  )}
                </button>

                <AnimatePresence>
                  {expandedDays.has(dayIdx) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      layout
                      className="border-t border-zinc-800/60 p-4 space-y-2 overflow-hidden"
                    >
                      {day.travel_time_from_prev_hours > 0 && (
                        <p className="text-xs text-zinc-500 italic">
                          {day.travel_time_from_prev_hours}h {day.travel_method_from_prev} from previous city
                        </p>
                      )}
                      {(day.stops || []).map((stop, stopIdx) => (
                        <motion.div
                          key={`${stop.name}-${stopIdx}`}
                          layout
                          className="flex items-start justify-between gap-3 bg-zinc-800/40 rounded-xl p-3 group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {stop.name}
                              {streetViewCoverage[getStopKey(stop)] && (
                                <span className="ml-1 text-xs">📷</span>
                              )}
                            </p>
                            <p className="text-xs text-zinc-500 capitalize">{stop.type}</p>
                            {stop.description && (
                              <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                                {stop.description}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              setSwapModal({ stop, dayIndex: dayIdx, stopIndex: stopIdx })
                            }
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-900/20 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                            title="Swap this stop"
                          >
                            <Pencil size={14} />
                          </button>
                        </motion.div>
                      ))}
                      {day.overnight_hotel && (
                        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/40 text-sm text-amber-400">
                          <span>🛏️</span>
                          <span className="font-medium">{day.overnight_hotel}</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Cost Breakdown */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-red-900/40 flex items-center justify-center text-red-400 text-sm font-bold">2</span>
            <DollarSign size={16} className="text-red-400" />
            Cost Breakdown
          </h2>

          {/* Section 3: Group size stepper (inline) */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2">
              <Users size={16} className="text-zinc-400" />
              <span className="text-sm text-zinc-400">Group Size:</span>
              <button
                onClick={() => handleGroupSizeChange(-1)}
                disabled={groupSize <= 1}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center disabled:opacity-40 transition-colors"
              >
                −
              </button>
              <span className="text-white font-bold w-6 text-center">{groupSize}</span>
              <button
                onClick={() => handleGroupSizeChange(1)}
                disabled={groupSize >= 12}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center disabled:opacity-40 transition-colors"
              >
                +
              </button>
            </div>
            {costsLoading && (
              <Loader2 size={16} className="animate-spin text-zinc-500" />
            )}
          </div>

          {costEstimates.length > 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Day</th>
                    <th className="text-right px-3 py-3">Accom.</th>
                    <th className="text-right px-3 py-3">Food</th>
                    <th className="text-right px-3 py-3">Transport</th>
                    <th className="text-right px-3 py-3">Activities</th>
                    <th className="text-right px-4 py-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {costEstimates.map((row, i) => {
                    const dayTotal =
                      ((row.accommodationLow + row.accommodationHigh) / 2 +
                        (row.foodLow + row.foodHigh) / 2 +
                        row.transport +
                        row.activities) *
                      groupSize;
                    return (
                      <tr
                        key={i}
                        className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${
                          i % 2 === 0 ? "bg-zinc-950/30" : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-white">
                          {row.city || `Day ${row.day}`}
                        </td>
                        <td className="px-3 py-3 text-right text-zinc-300">
                          ${row.accommodationLow}–{row.accommodationHigh}
                        </td>
                        <td className="px-3 py-3 text-right text-zinc-300">
                          ${row.foodLow}–{row.foodHigh}
                        </td>
                        <td className="px-3 py-3 text-right text-zinc-300">
                          ${row.transport}
                        </td>
                        <td className="px-3 py-3 text-right text-zinc-300">
                          ${row.activities}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-white">
                          ~${Math.round(dayTotal)}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total row */}
                  <tr className="bg-red-950/20 border-t-2 border-red-900/40 font-bold">
                    <td className="px-4 py-3 text-red-300 uppercase text-xs tracking-wider">
                      Total
                    </td>
                    <td colSpan={4} />
                    <td className="px-4 py-3 text-right text-red-300">
                      ${Math.round(totalLow)}–${Math.round(totalHigh)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-zinc-600 px-4 py-2 border-t border-zinc-800">
                Estimates in CAD per person · {groupSize} {groupSize === 1 ? "person" : "people"} total shown
              </p>
            </div>
          ) : costsLoading ? (
            <div className="flex items-center justify-center py-12 text-zinc-500 gap-3">
              <Loader2 className="animate-spin" size={18} />
              Estimating costs…
            </div>
          ) : null}
        </section>

        {/* Section 4: Packing List */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-red-900/40 flex items-center justify-center text-red-400 text-sm font-bold">3</span>
            <Package size={16} className="text-red-400" />
            Packing List
          </h2>

          {packingList.length > 0 ? (
            <div className="space-y-2">
              {packingList.map((cat) => (
                <div
                  key={cat.category}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedCategories((prev) => {
                        const next = new Set(prev);
                        if (next.has(cat.category)) {
                          next.delete(cat.category);
                        } else {
                          next.add(cat.category);
                        }
                        return next;
                      })
                    }
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 transition-colors"
                  >
                    <span className="font-semibold text-sm text-white">{cat.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">{cat.items.length} items</span>
                      {expandedCategories.has(cat.category) ? (
                        <ChevronUp size={16} className="text-zinc-500" />
                      ) : (
                        <ChevronDown size={16} className="text-zinc-500" />
                      )}
                    </div>
                  </button>
                  <AnimatePresence>
                    {expandedCategories.has(cat.category) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-zinc-800/50 px-4 py-3 grid grid-cols-2 gap-1 overflow-hidden"
                      >
                        {cat.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                            <span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
                            {item}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          ) : packingLoading ? (
            <div className="flex items-center justify-center py-12 text-zinc-500 gap-3">
              <Loader2 className="animate-spin" size={18} />
              Building packing list…
            </div>
          ) : null}
        </section>

        {/* Section 5: Export PDF */}
        <section>
          <button
            onClick={handleExportPDF}
            disabled={exportLoading}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold text-base transition-all shadow-lg shadow-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <FileDown size={20} />
            )}
            {exportLoading ? "Generating PDF…" : "Export PDF 📄"}
          </button>
        </section>
      </div>

      {/* Swap Modal */}
      <AnimatePresence>
        {swapModal && (
          <SwapModal
            stop={swapModal.stop}
            dayIndex={swapModal.dayIndex}
            stopIndex={swapModal.stopIndex}
            neighbours={days[swapModal.dayIndex]?.stops || []}
            onSwap={handleSwap}
            onClose={() => setSwapModal(null)}
            travelerProfile={travellerArchetype || ""}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
