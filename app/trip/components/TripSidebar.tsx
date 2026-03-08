"use client";

import { useSurveyStore } from "../../../lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Stop } from "../../../types";
import {
  ChevronDown,
  ChevronUp,
  Car,
  Plane,
  Train,
  Ship,
  ArrowRightCircle,
  BedDouble,
  Download,
  Loader2,
  ShoppingCart,
} from "lucide-react";
import { downloadItineraryPDF } from "./ItineraryPDF";
import { useRouter } from "next/navigation";

interface TripSidebarProps {
  onStopClick: (stop: Stop) => void;
}

export function TripSidebar({ onStopClick }: TripSidebarProps) {
  const { itinerary, travellerArchetype } = useSurveyStore();
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [downloading, setDownloading] = useState(false);
  const router = useRouter();

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      await downloadItineraryPDF(itinerary, travellerArchetype);
    } catch (err) {
      console.error("PDF download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  const getTravelIcon = (method: string) => {
    switch (method) {
      case "flight":
        return <Plane size={13} className="text-[#D97B4A]" />;
      case "train":
        return <Train size={13} className="text-[#C89A7A]" />;
      case "boat":
        return <Ship size={13} className="text-[#C89A7A]" />;
      case "none":
        return <ArrowRightCircle size={13} className="text-gray-400" />;
      case "drive":
      default:
        return <Car size={13} className="text-[#D97B4A]" />;
    }
  };

  return (
    <div className="w-full h-full bg-[#FAF7F2] flex flex-col border-l border-gray-200 relative z-20">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-[#FAF7F2]/90 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1">
              Your journey
            </p>
            <h2 className="text-xl font-medium text-gray-900 leading-tight">
              Your Itinerary
            </h2>
            {travellerArchetype && (
              <p className="text-sm text-gray-400 mt-0.5">
                Crafted for{" "}
                <span className="italic text-[#D97B4A]">{travellerArchetype}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              title="Save as PDF"
              className="p-2 rounded-full border border-gray-200 bg-white text-gray-400 hover:text-[#D97B4A] hover:border-[#C89A7A]/40 transition-all shadow-sm disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Download size={15} />
              )}
            </button>
            <button
              onClick={() => router.push("/checkout")}
              title="Finalize Trip"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C89A7A] text-white text-xs font-medium hover:bg-[#B88A6A] transition-colors shadow-sm"
            >
              <ShoppingCart size={13} />
              Finalize
            </button>
          </div>
        </div>
      </div>

      {/* Day List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {itinerary.map((day, dayIdx) => (
          <div
            key={day.date_offset}
            className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Day header button */}
            <button
              onClick={() => {
                setExpandedDay(
                  expandedDay === day.date_offset ? null : day.date_offset
                );
                if (day.stops && day.stops.length > 0 && day.stops[0].coordinates) {
                  onStopClick(day.stops[0]);
                }
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Day badge */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-sm text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #D97B4A, #C89A7A)" }}
                >
                  {day.date_offset}
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900 text-sm">{day.city}</h3>
                  <p className="text-xs text-gray-400">{day.province}</p>
                </div>
              </div>
              {expandedDay === day.date_offset ? (
                <ChevronUp size={16} className="text-gray-400" />
              ) : (
                <ChevronDown size={16} className="text-gray-400" />
              )}
            </button>

            {/* Expanded content */}
            <AnimatePresence>
              {expandedDay === day.date_offset && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-gray-100 px-4 py-4 overflow-hidden"
                >
                  {/* Travel info */}
                  {day.travel_time_from_prev_hours > 0 && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg mb-4">
                      {getTravelIcon(day.travel_method_from_prev)}
                      <span>
                        {day.travel_time_from_prev_hours}h{" "}
                        {day.travel_method_from_prev} from previous stop
                      </span>
                    </div>
                  )}

                  {/* Airport */}
                  {day.airport && day.airport.coordinates && (
                    <button
                      onClick={() =>
                        onStopClick({
                          name: day.airport!.name,
                          type: "airport",
                          coordinates: day.airport!.coordinates,
                          description: `Arrival airport for your flight into ${day.city}.`,
                        })
                      }
                      className="flex items-center gap-2 text-xs text-[#D97B4A] bg-orange-50 px-3 py-2 rounded-lg mb-4 border border-orange-100 w-full text-left hover:bg-orange-100/60 transition-colors"
                    >
                      <Plane size={12} className="flex-shrink-0" />
                      <span>{day.airport.name}</span>
                    </button>
                  )}

                  {/* Stops timeline */}
                  <div className="space-y-2.5 pl-2 border-l-2 border-gray-100 ml-3 py-1">
                    {day.stops?.map((stop, sIdx) => (
                      <motion.button
                        key={sIdx}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: sIdx * 0.04 }}
                        onClick={() => onStopClick(stop)}
                        className="flex items-start gap-3 w-full text-left group relative"
                      >
                        {/* Timeline dot */}
                        <div className="absolute -left-[13px] w-2.5 h-2.5 rounded-full bg-gray-200 group-hover:bg-[#D97B4A] transition-colors mt-1.5 flex-shrink-0" />
                        <div className="flex flex-col pl-1">
                          <span className="text-sm text-gray-700 group-hover:text-[#D97B4A] transition-colors font-medium leading-snug">
                            {stop.name}
                          </span>
                          {stop.description && (
                            <span className="text-xs text-gray-400 group-hover:text-gray-500 transition-colors leading-relaxed mt-0.5">
                              {stop.description}
                            </span>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {/* Hotel */}
                  {day.overnight_hotel && (
                    <button
                      onClick={() => {
                        if (day.overnight_hotel_coordinates?.length === 2) {
                          onStopClick({
                            name: day.overnight_hotel,
                            type: "hotel",
                            coordinates: day.overnight_hotel_coordinates as [
                              number,
                              number
                            ],
                            description: `Your overnight stay in ${day.city}.`,
                          });
                        }
                      }}
                      className="mt-4 p-3 bg-amber-50 rounded-xl flex items-start gap-3 border border-amber-100 w-full text-left hover:bg-amber-100/60 transition-colors group"
                    >
                      <BedDouble
                        size={15}
                        className="text-[#C89A7A] mt-0.5 flex-shrink-0"
                      />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-0.5">
                          Stay At
                        </p>
                        <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                          {day.overnight_hotel}
                        </p>
                      </div>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
