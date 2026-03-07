"use client";

import { useSurveyStore } from "../../../lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Stop } from "../../../types";
import { ChevronDown, ChevronUp, Car, Plane, Train, Ship, ArrowRightCircle, BedDouble, Download, Loader2 } from "lucide-react";
import { downloadItineraryPDF } from "./ItineraryPDF";

interface TripSidebarProps {
   onStopClick: (stop: Stop) => void;
}

export function TripSidebar({ onStopClick }: TripSidebarProps) {
  const { itinerary, travellerArchetype } = useSurveyStore();
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [downloading, setDownloading] = useState(false);

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
      case 'flight': return <Plane size={16} className="text-blue-400" />;
      case 'train': return <Train size={16} className="text-orange-400" />;
      case 'boat': return <Ship size={16} className="text-sky-400" />;
      case 'none': return <ArrowRightCircle size={16} className="text-zinc-500" />;
      case 'drive':
      default: return <Car size={16} className="text-emerald-400" />;
    }
  };

  return (
    <div className="w-full h-full bg-zinc-950 flex flex-col border-l border-zinc-800 relative z-20">
       <div className="p-6 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-start justify-between">
             <div>
                <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200">
                   Your Itinerary
                </h2>
                <p className="text-zinc-400 text-sm">Crafted for {travellerArchetype}</p>
             </div>
             <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                title="Save as PDF"
                className="mt-1 p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-emerald-400 transition-colors disabled:opacity-50"
             >
                {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
             </button>
          </div>
       </div>

       <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
          {itinerary.map((day) => (
             <div key={day.date_offset} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors">
                <button 
                   onClick={() => {
                      setExpandedDay(expandedDay === day.date_offset ? null : day.date_offset);
                      if (day.stops && day.stops.length > 0 && day.stops[0].coordinates) {
                         onStopClick(day.stops[0]);
                      }
                   }}
                   className="w-full flex items-center justify-between p-4"
                >
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-bold text-lg text-emerald-400">
                         {day.date_offset}
                      </div>
                      <div className="text-left">
                         <h3 className="font-bold text-white">{day.city}</h3>
                         <p className="text-xs text-zinc-500">{day.province}</p>
                      </div>
                   </div>
                   {expandedDay === day.date_offset ? <ChevronUp size={20} className="text-zinc-500" /> : <ChevronDown size={20} className="text-zinc-500" />}
                </button>

                <AnimatePresence>
                   {expandedDay === day.date_offset && (
                      <motion.div 
                         initial={{ height: 0, opacity: 0 }}
                         animate={{ height: "auto", opacity: 1 }}
                         exit={{ height: 0, opacity: 0 }}
                         className="p-4 pt-0 border-t border-zinc-800/50"
                      >
                         {day.travel_time_from_prev_hours > 0 && (
                            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-950 p-2 rounded-lg mb-4">
                               {getTravelIcon(day.travel_method_from_prev)}
                               <span>{day.travel_time_from_prev_hours} hours {day.travel_method_from_prev} from previous stop</span>
                            </div>
                         )}

                         {day.airport && day.airport.coordinates && (
                            <button 
                               onClick={() => onStopClick({ name: day.airport!.name, type: "airport", coordinates: day.airport!.coordinates, description: `Arrival airport for your flight into ${day.city}.` })}
                               className="flex items-center gap-2 text-xs font-medium text-blue-300 bg-blue-950/40 p-2 rounded-lg mb-4 border border-blue-900/30 w-full text-left hover:bg-blue-950/60 hover:border-blue-700/50 transition-colors group"
                            >
                               <Plane size={14} className="text-blue-400 flex-shrink-0 group-hover:text-blue-300" />
                               <span>✈️ {day.airport.name}</span>
                            </button>
                         )}
                         
                         <div className="space-y-3 pl-2 border-l border-zinc-700 ml-4 py-2">
                           {day.stops?.map((stop, sIdx) => (
                              <button 
                                 key={sIdx}
                                 onClick={() => onStopClick(stop)}
                                 className="flex items-center gap-3 w-full text-left group relative"
                              >
                                 <div className="absolute -left-3.5 w-2 h-2 rounded-full bg-zinc-700 group-hover:bg-emerald-400 transition-colors" />
                                 <span className="text-sm text-zinc-300 group-hover:text-emerald-300 transition-colors py-1">
                                    {stop.name}
                                 </span>
                              </button>
                           ))}
                         </div>

                         {day.overnight_hotel && (
                            <button 
                               onClick={() => {
                                  if (day.overnight_hotel_coordinates?.length === 2) {
                                     onStopClick({ name: day.overnight_hotel, type: "hotel", coordinates: day.overnight_hotel_coordinates as [number, number], description: `Your overnight stay in ${day.city}.` });
                                  }
                               }}
                               className="mt-4 p-3 bg-zinc-950 rounded-xl flex items-start gap-3 border border-zinc-800/50 w-full text-left hover:bg-zinc-900 hover:border-zinc-700 transition-colors group"
                            >
                               <BedDouble size={16} className="text-amber-400 mt-0.5 flex-shrink-0 group-hover:text-amber-300" />
                               <div>
                                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">Stay At</p>
                                  <p className="text-sm font-medium text-amber-100 group-hover:text-amber-50">{day.overnight_hotel}</p>
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
