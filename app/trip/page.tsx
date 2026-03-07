"use client";

import { useSurveyStore } from "../../lib/store";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MapPin, Car, BedDouble, Calendar } from "lucide-react";

export default function TripPage() {
  const { itinerary, travellerArchetype } = useSurveyStore();
  const router = useRouter();

  if (!itinerary || itinerary.length === 0) {
     return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white">
            <h1 className="text-2xl text-zinc-400 mb-4">No itinerary generated.</h1>
            <button onClick={() => router.push('/preferences')} className="text-emerald-400 underline">
               Go Back
            </button>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12 lg:p-16 relative overflow-hidden">
       {/* Background gradients */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-900/10 blur-[150px] rounded-full pointer-events-none fixed" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-900/10 blur-[150px] rounded-full pointer-events-none fixed" />
      
      <div className="max-w-4xl mx-auto relative z-10 block">
         <div className="mb-16">
            <motion.h1 
               initial={{ opacity: 0, y: -20 }}
               animate={{ opacity: 1, y: 0 }}
               className="text-4xl md:text-5xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-teal-200 to-white drop-shadow-sm"
            >
               Your Custom Canadian Itinerary
            </motion.h1>
            <motion.p 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.2 }}
               className="text-xl text-zinc-400 font-light"
            >
               Expertly curated for <strong className="text-emerald-400">{travellerArchetype}</strong>
            </motion.p>
         </div>

         <div className="space-y-8">
            {itinerary.map((day, idx) => (
               <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 backdrop-blur-md relative overflow-hidden"
               >
                  <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-emerald-500 to-teal-400" />
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                     <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex flex-col items-center justify-center border border-zinc-700">
                           <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Day</span>
                           <span className="text-2xl font-black text-white">{day.date_offset}</span>
                        </div>
                        <div>
                           <h2 className="text-2xl font-bold">{day.city}</h2>
                           <p className="text-emerald-400 font-medium">{day.province}</p>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-3 text-sm font-medium bg-zinc-800/50 py-2 px-4 rounded-full border border-zinc-700/50">
                        <Car size={16} className="text-zinc-400" />
                        <span>{day.drive_time_from_prev_hours} hours driving</span>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-zinc-300">
                           <MapPin size={20} className="text-teal-400" />
                           Key Stops
                        </h3>
                        <ul className="space-y-4">
                           {day.stops.map((stop, sIdx) => (
                              <li key={sIdx} className="flex relative">
                                 <div className="absolute left-[7px] top-6 bottom-[-20px] w-0.5 bg-zinc-800 last:hidden" />
                                 <div className="w-4 h-4 rounded-full bg-zinc-800 border-2 border-teal-500 mt-1 flex-shrink-0 z-10" />
                                 <span className="ml-4 text-zinc-300 leading-relaxed font-light">{stop}</span>
                              </li>
                           ))}
                        </ul>
                     </div>

                     <div className="bg-zinc-800/20 rounded-2xl p-6 border border-zinc-800/50 h-fit">
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-zinc-300">
                           <BedDouble size={20} className="text-amber-400" />
                           Overnight Stay
                        </h3>
                        <p className="text-zinc-400 font-light leading-relaxed">
                           {day.overnight_hotel}
                        </p>
                     </div>
                  </div>
               </motion.div>
            ))}
         </div>

         <div className="mt-16 flex justify-center pb-16">
            <button 
              onClick={() => window.print()}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-full font-bold shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <Calendar size={20} />
              Save Your Itinerary
            </button>
         </div>
      </div>
    </div>
  );
}
