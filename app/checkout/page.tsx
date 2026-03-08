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
  Calendar,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 12 }}
        className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-xl"
      >
        <h3 className="text-base font-semibold text-gray-900 mb-1">Swap Stop</h3>
        <p className="text-sm text-gray-500 mb-4">
          Replacing:{" "}
          <span className="text-gray-800 font-medium italic">{stop.name}</span>
        </p>

        <textarea
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          placeholder="What would you prefer instead? e.g. 'A brewery tour' or 'Something more family-friendly'"
          rows={3}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D97B4A]/20 focus:border-[#D97B4A]/40 resize-none mb-4 transition-colors"
        />

        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSwap}
            disabled={loading || !suggestion.trim()}
            className="flex-1 py-2.5 rounded-full text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #D97B4A, #C89A7A)" }}
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const [exportLoading, setExportLoading] = useState(false);

  const trip = {
    id: "current-trip",
    title: "My BeaverTrails Trip",
    days,
    travellerProfile: travellerArchetype || "",
    totalCostEstimate: 0,
    budgetTier: budgetPerPerson || "mid-range",
  };

  useEffect(() => {
    if (itinerary && itinerary.length > 0) {
      setDays([...itinerary]);
    }
  }, [itinerary]);

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

  const fetchPackingList = useCallback(async () => {
    if (!days.length) return;
    setPackingLoading(true);
    try {
      const res = await fetch("/api/packing-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip: { ...trip, days },
          travelerProfile: travellerArchetype,
        }),
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
        // QR code generation failed
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

  const totalLow =
    costEstimates.reduce(
      (sum, d) =>
        sum + d.accommodationLow + d.foodLow + d.transport + d.activities,
      0
    ) * groupSize;
  const totalHigh =
    costEstimates.reduce(
      (sum, d) =>
        sum + d.accommodationHigh + d.foodHigh + d.transport + d.activities,
      0
    ) * groupSize;

  if (!itinerary || itinerary.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF7F2] text-gray-900">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-3">Nothing here yet</p>
        <p className="text-gray-500 mb-6">No itinerary to finalize.</p>
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#C89A7A] text-white text-sm font-medium hover:bg-[#B88A6A] transition-colors"
        >
          Start over
        </button>
      </div>
    );
  }

  const SectionLabel = ({
    num,
    icon: Icon,
    label,
  }: {
    num: string;
    icon: React.ElementType;
    label: string;
  }) => (
    <div className="flex items-center gap-3 mb-5">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #D97B4A, #C89A7A)" }}
      >
        {num}
      </div>
      <Icon size={15} className="text-[#D97B4A]" />
      <h2 className="text-lg font-medium text-gray-900">{label}</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900">
      {/* Left edge decoration */}
      <div
        className="fixed top-0 left-0 h-full w-[11vw] pointer-events-none z-0"
        style={{
          WebkitMaskImage: "linear-gradient(to right, rgba(0,0,0,0.18) 0%, transparent 100%)",
          maskImage: "linear-gradient(to right, rgba(0,0,0,0.18) 0%, transparent 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/earthtone.png"
          alt=""
          className="w-full h-full object-cover"
          style={{ objectPosition: "left center" }}
        />
      </div>
      {/* Right edge decoration */}
      <div
        className="fixed top-0 right-0 h-full w-[11vw] pointer-events-none z-0"
        style={{
          WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.18) 0%, transparent 100%)",
          maskImage: "linear-gradient(to left, rgba(0,0,0,0.18) 0%, transparent 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/earthtone.png"
          alt=""
          className="w-full h-full object-cover"
          style={{ objectPosition: "right center" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 max-w-2xl mx-auto px-6 py-16 md:py-20 space-y-14"
      >
        {/* ─── Header ─── */}
        <div>
          <button
            onClick={() => router.push("/trip")}
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-8"
          >
            <ArrowLeft size={14} />
            Back to map
          </button>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-3">
            Finalize your adventure
          </p>
          <h1 className="text-3xl md:text-4xl font-medium text-gray-900 leading-tight">
            Your trip,{" "}
            <span className="italic text-[#D97B4A]">ready to go.</span>
          </h1>
          {travellerArchetype && (
            <p className="text-gray-500 mt-2 leading-relaxed">
              Curated for a{" "}
              <span className="italic text-[#C89A7A]">{travellerArchetype}</span>. Review,
              customize, and export below.
            </p>
          )}
        </div>

        {/* ─── Section 1: Itinerary ─── */}
        <section>
          <SectionLabel num="1" icon={Calendar} label="Itinerary" />
          <div className="space-y-3">
            {days.map((day, dayIdx) => (
              <div
                key={day.date_offset}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() =>
                    setExpandedDays((prev) => {
                      const next = new Set(prev);
                      if (next.has(dayIdx)) next.delete(dayIdx);
                      else next.add(dayIdx);
                      return next;
                    })
                  }
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-sm text-white flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #D97B4A, #C89A7A)" }}
                    >
                      {day.date_offset}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{day.city}</p>
                      <p className="text-xs text-gray-400">
                        {day.province} · {day.stops?.length || 0} stops
                      </p>
                    </div>
                  </div>
                  {expandedDays.has(dayIdx) ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </button>

                <AnimatePresence>
                  {expandedDays.has(dayIdx) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-gray-100 px-5 py-4 space-y-2 overflow-hidden"
                    >
                      {day.travel_time_from_prev_hours > 0 && (
                        <p className="text-xs text-gray-400 italic mb-2">
                          {day.travel_time_from_prev_hours}h{" "}
                          {day.travel_method_from_prev} from previous city
                        </p>
                      )}
                      {(day.stops || []).map((stop, stopIdx) => (
                        <motion.div
                          key={`${stop.name}-${stopIdx}`}
                          layout
                          className="flex items-start justify-between gap-3 bg-gray-50 rounded-xl p-3 group hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {stop.name}
                              {streetViewCoverage[getStopKey(stop)] && (
                                <span className="ml-1 text-xs">📷</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-400 capitalize">{stop.type}</p>
                            {stop.description && (
                              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                                {stop.description}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              setSwapModal({
                                stop,
                                dayIndex: dayIdx,
                                stopIndex: stopIdx,
                              })
                            }
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#D97B4A] hover:bg-orange-50 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                            title="Swap this stop"
                          >
                            <Pencil size={13} />
                          </button>
                        </motion.div>
                      ))}
                      {day.overnight_hotel && (
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-sm text-[#C89A7A]">
                          <span>🛏️</span>
                          <span className="font-medium text-gray-700">
                            {day.overnight_hotel}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Section 2: Cost Breakdown ─── */}
        <section>
          <SectionLabel num="2" icon={DollarSign} label="Cost Breakdown" />

          {/* Group size stepper */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
              <Users size={14} className="text-gray-400" />
              <span className="text-sm text-gray-500">Group size</span>
              <button
                onClick={() => handleGroupSizeChange(-1)}
                disabled={groupSize <= 1}
                className="w-6 h-6 rounded-full border border-gray-200 text-gray-500 hover:border-[#C89A7A] hover:text-[#D97B4A] font-bold flex items-center justify-center disabled:opacity-30 transition-colors text-sm"
              >
                −
              </button>
              <span className="text-gray-900 font-semibold w-5 text-center text-sm">
                {groupSize}
              </span>
              <button
                onClick={() => handleGroupSizeChange(1)}
                disabled={groupSize >= 12}
                className="w-6 h-6 rounded-full border border-gray-200 text-gray-500 hover:border-[#C89A7A] hover:text-[#D97B4A] font-bold flex items-center justify-center disabled:opacity-30 transition-colors text-sm"
              >
                +
              </button>
            </div>
            {costsLoading && (
              <Loader2 size={14} className="animate-spin text-gray-400" />
            )}
          </div>

          {costEstimates.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.15em] font-medium text-gray-400">
                      Day
                    </th>
                    <th className="text-right px-3 py-3 text-[10px] uppercase tracking-[0.15em] font-medium text-gray-400">
                      Accom.
                    </th>
                    <th className="text-right px-3 py-3 text-[10px] uppercase tracking-[0.15em] font-medium text-gray-400">
                      Food
                    </th>
                    <th className="text-right px-3 py-3 text-[10px] uppercase tracking-[0.15em] font-medium text-gray-400">
                      Transport
                    </th>
                    <th className="text-right px-3 py-3 text-[10px] uppercase tracking-[0.15em] font-medium text-gray-400">
                      Activities
                    </th>
                    <th className="text-right px-5 py-3 text-[10px] uppercase tracking-[0.15em] font-medium text-gray-400">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {costEstimates.map((row, i) => {
                    const dayTotal =
                      (((row.accommodationLow + row.accommodationHigh) / 2 +
                        (row.foodLow + row.foodHigh) / 2 +
                        row.transport +
                        row.activities) *
                        groupSize);
                    return (
                      <tr
                        key={i}
                        className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                          i % 2 === 0 ? "" : "bg-[#FAF7F2]/50"
                        }`}
                      >
                        <td className="px-5 py-3 font-medium text-gray-800">
                          {row.city || `Day ${row.day}`}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-500">
                          ${row.accommodationLow}–{row.accommodationHigh}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-500">
                          ${row.foodLow}–{row.foodHigh}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-500">
                          ${row.transport}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-500">
                          ${row.activities}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-900">
                          ~${Math.round(dayTotal)}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="border-t-2 border-[#C89A7A]/30">
                    <td className="px-5 py-3 text-[10px] uppercase tracking-[0.15em] font-medium text-[#D97B4A]">
                      Total
                    </td>
                    <td colSpan={4} />
                    <td className="px-5 py-3 text-right font-semibold text-[#D97B4A]">
                      ${Math.round(totalLow)}–${Math.round(totalHigh)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-gray-400 px-5 py-3 border-t border-gray-100">
                Estimates in CAD per person ·{" "}
                {groupSize} {groupSize === 1 ? "person" : "people"} total shown
              </p>
            </div>
          ) : costsLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400 gap-3">
              <Loader2 className="animate-spin" size={16} />
              <span className="text-sm">Estimating costs…</span>
            </div>
          ) : null}
        </section>

        {/* ─── Section 3: Packing List ─── */}
        <section>
          <SectionLabel num="3" icon={Package} label="Packing List" />

          {packingList.length > 0 ? (
            <div className="space-y-2">
              {packingList.map((cat) => (
                <div
                  key={cat.category}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
                >
                  <button
                    onClick={() =>
                      setExpandedCategories((prev) => {
                        const next = new Set(prev);
                        if (next.has(cat.category)) next.delete(cat.category);
                        else next.add(cat.category);
                        return next;
                      })
                    }
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-800">{cat.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{cat.items.length} items</span>
                      {expandedCategories.has(cat.category) ? (
                        <ChevronUp size={14} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={14} className="text-gray-400" />
                      )}
                    </div>
                  </button>
                  <AnimatePresence>
                    {expandedCategories.has(cat.category) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="border-t border-gray-100 px-4 py-3.5 grid grid-cols-2 gap-1.5 overflow-hidden"
                      >
                        {cat.items.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-sm text-gray-600"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: "#C89A7A" }}
                            />
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
            <div className="flex items-center justify-center py-12 text-gray-400 gap-3">
              <Loader2 className="animate-spin" size={16} />
              <span className="text-sm">Building packing list…</span>
            </div>
          ) : null}
        </section>

        {/* ─── Export PDF ─── */}
        <section className="pb-8">
          <button
            onClick={handleExportPDF}
            disabled={exportLoading}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-full text-white font-medium text-sm transition-all shadow-[0_4px_20px_rgba(217,123,74,0.3)] hover:shadow-[0_6px_24px_rgba(217,123,74,0.4)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #D97B4A, #C89A7A)" }}
          >
            {exportLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <FileDown size={18} />
            )}
            {exportLoading ? "Generating PDF…" : "Export Itinerary as PDF"}
          </button>
        </section>
      </motion.div>

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
