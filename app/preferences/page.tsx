"use client";

import { useSurveyStore } from "../../lib/store";
import { motion } from "framer-motion";
import { Compass, Map, UserRound } from "lucide-react";

export default function PreferencesPage() {
  const { travellerArchetype, recommendedProvinces, resetSurvey } = useSurveyStore();

  if (!travellerArchetype) {
     return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white">
            <h1 className="text-2xl text-zinc-400 mb-4">No survey data found.</h1>
            <button onClick={() => window.location.href = '/survey'} className="text-emerald-400 underline">
               Take the Survey
            </button>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 md:p-16 flex flex-col items-center relative overflow-hidden">
       {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-900/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-900/10 blur-[150px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-4xl w-full z-10"
      >
        <div className="flex flex-col items-center text-center mb-16">
          <div className="p-5 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-6">
             <Compass size={48} className="text-emerald-400" />
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-teal-200 to-white drop-shadow-sm">
             Your Travel Profile
          </h1>
          <p className="text-xl text-zinc-400 font-light max-w-2xl">
            Based on your answers, we&apos;ve analyzed your travel style and formulated the perfect Canadian destinations for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
           {/* Archetype Card */}
           <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 rounded-3xl bg-zinc-900/40 border border-zinc-800 backdrop-blur-md relative overflow-hidden group"
           >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full transition-all group-hover:bg-amber-500/20" />
              <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 bg-amber-500/20 rounded-xl">
                    <UserRound className="text-amber-400" size={28} />
                 </div>
                 <h2 className="text-2xl font-bold text-zinc-100">Your Archetype</h2>
              </div>
              <p className="text-3xl font-light text-amber-300 leading-tight">
                 {travellerArchetype}
              </p>
           </motion.div>

           {/* Provinces Card */}
           <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 rounded-3xl bg-zinc-900/40 border border-zinc-800 backdrop-blur-md relative overflow-hidden group"
           >
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 blur-[50px] rounded-full transition-all group-hover:bg-sky-500/20" />
              <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 bg-sky-500/20 rounded-xl">
                    <Map className="text-sky-400" size={28} />
                 </div>
                 <h2 className="text-2xl font-bold text-zinc-100">Top Destinations</h2>
              </div>
              
              <ul className="space-y-4">
                 {recommendedProvinces.map((prov, i) => (
                    <li key={i} className="flex items-center gap-3 text-2xl font-light text-sky-200">
                       <span className="w-2 h-2 rounded-full bg-sky-400" />
                       {prov}
                    </li>
                 ))}
              </ul>
           </motion.div>
        </div>

        <div className="mt-16 flex justify-center">
           <button 
             onClick={() => {
                resetSurvey();
                window.location.href = '/survey';
             }}
             className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full font-medium transition-all"
           >
             Retake Survey
           </button>
        </div>
      </motion.div>
    </div>
  );
}
