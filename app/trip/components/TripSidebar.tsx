"use client";

import { useSurveyStore } from "../../../lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Stop } from "../../../types";
import { ChevronDown, ChevronUp, Car, Plane, Train, Ship, ArrowRightCircle, BedDouble, ShoppingCart, UtensilsCrossed, MapPin, TreePine, Bus } from "lucide-react";
import { useRouter } from "next/navigation";

interface TripSidebarProps {
   onStopClick: (stop: Stop) => void;
}

export function TripSidebar({ onStopClick }: TripSidebarProps) {
  const { itinerary, travellerArchetype } = useSurveyStore();
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const router = useRouter();

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

  const getStopIcon = (type: string) => {
    switch (type) {
      case 'airport': return <Plane size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />;
      case 'transit': return <Bus size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />;
      case 'restaurant': return <UtensilsCrossed size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />;
      case 'hotel': return <BedDouble size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />;
      case 'attraction': return <MapPin size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />;
      case 'park': return <TreePine size={14} className="text-green-400 flex-shrink-0 mt-0.5" />;
      default: return <MapPin size={14} className="text-zinc-400 flex-shrink-0 mt-0.5" />;
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
             <div className="flex items-center gap-2 mt-1">
                <button
                   onClick={() => router.push("/checkout")}
                   title="Finalize Trip"
                   className="p-2 rounded-xl bg-red-900/40 hover:bg-red-800/60 border border-red-800/50 hover:border-red-700 text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5 text-xs font-semibold pr-3"
                >
                   <ShoppingCart size={14} />
                   Finalize
                </button>
             </div>
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

                         <div className="space-y-2">
                           {(day.stops || []).map((stop, sIdx) => (
                              <button
                                 key={sIdx}
                                 onClick={() => onStopClick(stop)}
                                 className="w-full text-left p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/50 hover:bg-zinc-900 hover:border-zinc-700 transition-colors group"
                              >
                                 <div className="flex items-start gap-3">
                                   {getStopIcon(stop.type)}
                                   <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                     <span className="text-sm font-medium text-zinc-200 group-hover:text-emerald-300 transition-colors truncate">
                                        {stop.name}
                                     </span>
                                     {stop.description && (
                                       <span className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors line-clamp-3">
                                         {stop.description}
                                       </span>
                                     )}
                                   </div>
                                 </div>
                              </button>
                           ))}
                         </div>
                      </motion.div>
                   )}
                </AnimatePresence>
             </div>
          ))}
       </div>
    </div>
  );
}
