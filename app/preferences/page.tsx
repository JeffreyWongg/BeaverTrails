"use client";

import { useSurveyStore } from "../../lib/store";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Map, UserRound, Trees, Building2, Utensils,
  Camera, Tent, MountainSnow, Sunrise, Car, MapPin, Map as MapIcon, GlassWater
} from "lucide-react";

export default function PreferencesPage() {
  const { 
    travellerArchetype, recommendedProvinces, resetSurvey, 
    activities, setField, dreamTrip 
  } = useSurveyStore();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const activityOptions = [
    { id: "hiking", label: "Hiking & Trails", icon: Trees },
    { id: "museums", label: "Museums & Arts", icon: Building2 },
    { id: "food", label: "Food & Drink", icon: Utensils },
    { id: "wildlife", label: "Wildlife Watching", icon: Camera },
    { id: "indigenous", label: "Indigenous Culture", icon: MapPin },
    { id: "skiing", label: "Skiing / Winter Sports", icon: MountainSnow },
    { id: "beaches", label: "Beaches & Lakes", icon: Sunrise },
    { id: "roadtrips", label: "Scenic Road Trips", icon: Car },
    { id: "history", label: "Historical Sites", icon: MapIcon },
    { id: "photography", label: "Photography Spots", icon: Camera }, // reusing camera
    { id: "nightlife", label: "Nightlife & Music", icon: GlassWater },
    { id: "festivals", label: "Local Festivals", icon: Tent },
  ];

  const handleToggleActivity = (id: string) => {
     let nextActivities = [...activities];
     if (nextActivities.includes(id)) {
        nextActivities = nextActivities.filter(a => a !== id);
     } else {
        nextActivities.push(id);
     }
     setField("activities", nextActivities);
  };

  const [genError, setGenError] = useState("");

  const handleGenerate = async () => {
     setIsGenerating(true);
     setGenError("");
     
     try {
         const s = useSurveyStore.getState();
         const payload = {
           ageRange: s.ageRange,
           accessibilityNeeds: s.accessibilityNeeds,
           groupComposition: s.groupComposition,
           tripDuration: s.tripDuration,
           budgetPerPerson: s.budgetPerPerson,
           luggageAmount: s.luggageAmount,
           startingCity: s.startingCity,
           travellerArchetype: s.travellerArchetype,
           recommendedProvinces: s.recommendedProvinces,
           activities: s.activities,
           dreamTrip: s.dreamTrip,
           tiktokClips: s.tiktokClips,
         };

         const controller = new AbortController();
         const timeout = setTimeout(() => controller.abort(), 120000); // 2 min client timeout
         
         const response = await fetch("/api/generate-itinerary", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify(payload),
             signal: controller.signal,
         });

         clearTimeout(timeout);

         if (response.ok) {
             const itinerary = await response.json();
             setField("itinerary", itinerary);
             router.push("/trip");
         } else {
             const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
             console.error("Failed to generate itinerary:", response.status, errorData);
             
             // Show more specific error messages
             let errorMessage = "AI models are busy. Please try again.";
             if (errorData.detail) {
               if (errorData.detail.includes("timed out")) {
                 errorMessage = "Request timed out. The AI is taking too long. Please try again.";
               } else if (errorData.detail.includes("API key")) {
                 errorMessage = "API configuration error. Please contact support.";
               } else if (errorData.detail.includes("rate limit") || errorData.detail.includes("429")) {
                 errorMessage = "Too many requests. Please wait a moment and try again.";
               } else {
                 errorMessage = `Error: ${errorData.detail.slice(0, 100)}`;
               }
             }
             
             setGenError(errorMessage);
             setIsGenerating(false);
         }
     } catch (err) {
         console.error(err);
         setGenError(err instanceof DOMException && err.name === "AbortError" 
           ? "Request timed out. Please try again." 
           : "Something went wrong. Please try again.");
         setIsGenerating(false);
     }
  };

  if (!travellerArchetype) {
     return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white">
            <h1 className="text-2xl text-zinc-400 mb-4">No survey data found.</h1>
            <button onClick={() => router.push('/survey')} className="text-emerald-400 underline">
               Take the Survey
            </button>
        </div>
     );
  }

  // --- LOADING STATE ---
  if (isGenerating || genError) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center relative overflow-hidden">
         <div className="absolute top-0 w-full h-1 bg-zinc-800">
            {!genError && (
              <motion.div 
                 className="h-full bg-emerald-500" 
                 initial={{ width: "0%" }}
                 animate={{ width: "95%" }}
                 transition={{ duration: 60, ease: "easeOut" }}
              />
            )}
         </div>
         
         <div className="relative w-full max-w-lg aspect-square flex items-center justify-center mb-12 opacity-80 mix-blend-screen">
             <motion.svg 
               viewBox="0 0 800 600" 
               className="w-full h-full text-zinc-800"
               fill="currentColor"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ duration: 1 }}
             >
                <path d="M 200,400 Q 150,300 250,200 T 500,150 Q 600,150 700,250 T 600,450 Q 400,500 200,400" className="opacity-20" />
                
                {!genError && (
                  <motion.circle 
                     cx="400" cy="300" r="10" 
                     className="fill-emerald-400"
                     animate={{ 
                        scale: [1, 2, 1],
                        opacity: [1, 0.4, 1],
                        cx: [200, 400, 600, 400],
                        cy: [400, 300, 250, 450]
                     }}
                     transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
             </motion.svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                 {genError ? (
                   <>
                     <h2 className="text-2xl font-bold text-red-400 mb-2">Generation Failed</h2>
                     <p className="text-zinc-400 text-lg mb-6">{genError}</p>
                     <button 
                       onClick={() => { setGenError(""); handleGenerate(); }}
                       className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-semibold transition-colors"
                     >
                       Try Again
                     </button>
                   </>
                 ) : (
                   <>
                     <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200 animate-pulse drop-shadow-lg mb-2">
                        Crafting Your Itinerary
                     </h2>
                     <p className="text-zinc-400 text-lg">Finding hidden gems across Canada...</p>
                     <p className="text-zinc-600 text-sm mt-4">This may take up to a minute</p>
                   </>
                 )}
             </div>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12 lg:p-16 flex flex-col items-center relative overflow-hidden">
       {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-900/10 blur-[150px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-5xl w-full z-10 flex flex-col items-center"
      >
        <div className="flex flex-col items-center text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-teal-200 to-white drop-shadow-sm">
             Your Travel Profile
          </h1>
          <p className="text-lg text-zinc-400 font-light max-w-2xl">
            Based on your answers, we&apos;ve analyzed your travel style. Now, let&apos;s fine-tune what you want to do.
          </p>
        </div>

        {/* AI Results Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-16">
           <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 backdrop-blur-md flex items-center gap-6">
              <div className="p-3 bg-amber-500/20 rounded-xl">
                 <UserRound className="text-amber-400" size={32} />
              </div>
              <div>
                 <h2 className="text-sm uppercase tracking-wider text-zinc-500 font-bold mb-1">Your Archetype</h2>
                 <p className="text-2xl font-light text-amber-300">{travellerArchetype}</p>
              </div>
           </div>

           <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 backdrop-blur-md flex items-center gap-6">
              <div className="p-3 bg-sky-500/20 rounded-xl">
                 <Map className="text-sky-400" size={32} />
              </div>
              <div>
                 <h2 className="text-sm uppercase tracking-wider text-zinc-500 font-bold mb-1">Top Destinations</h2>
                 <p className="text-xl font-light text-sky-200">{recommendedProvinces.join(", ")}</p>
              </div>
           </div>
        </div>

        <hr className="w-full border-zinc-800 mb-16" />

        {/* Activities Selection */}
        <div className="w-full mb-16">
           <h2 className="text-3xl font-bold mb-2">What would you like to do?</h2>
           <p className="text-zinc-500 mb-8">Select as many activities as you enjoy.</p>
           
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {activityOptions.map((opt) => {
                 const isSelected = activities.includes(opt.id);
                 const Icon = opt.icon;
                 
                 return (
                    <motion.button
                       key={opt.id}
                       whileHover={{ scale: 1.02 }}
                       whileTap={{ scale: 0.98 }}
                       onClick={() => handleToggleActivity(opt.id)}
                       className={`p-4 rounded-2xl flex flex-col items-start gap-3 border transition-all text-left ${
                          isSelected 
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                            : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700"
                       }`}
                    >
                       <Icon size={24} className={isSelected ? "text-emerald-400" : "text-zinc-500"} />
                       <span className="font-medium">{opt.label}</span>
                    </motion.button>
                 );
              })}
           </div>
        </div>

        {/* Free Text Input */}
        <div className="w-full mb-16">
           <h2 className="text-2xl font-bold mb-4">Anything else? Describe your dream trip...</h2>
           <textarea 
              value={dreamTrip}
              onChange={(e) => setField("dreamTrip", e.target.value)}
              placeholder="e.g. I want to see a moose, avoid large crowds, and visit a local brewery..."
              className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none transition-all placeholder:text-zinc-600"
           />
        </div>

        <div className="w-full flex justify-between items-center mb-8">
           <button 
             onClick={() => {
                resetSurvey();
                router.push('/survey');
             }}
             className="px-6 py-3 text-zinc-400 hover:text-white transition-colors"
           >
             Start Over
           </button>
           
           <button 
             onClick={handleGenerate}
             disabled={activities.length === 0}
             className={`px-8 py-4 rounded-full font-bold text-lg shadow-xl transition-all transform ${
                activities.length === 0 
                  ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  : "bg-white text-zinc-950 hover:bg-zinc-200 hover:scale-105 active:scale-95"
             }`}
           >
             Generate My Itinerary
           </button>
        </div>
      </motion.div>
    </div>
  );
}
