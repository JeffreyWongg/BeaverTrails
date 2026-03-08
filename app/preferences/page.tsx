"use client";

import { useSurveyStore } from "../../lib/store";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Trees, Building2, Utensils,
  Camera, Tent, MountainSnow, Sunrise, Car, MapPin, Map as MapIcon, GlassWater,
  ArrowRight, RotateCcw, Loader2, Sparkles,
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
    { id: "photography", label: "Photography Spots", icon: Camera },
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
         const timeout = setTimeout(() => controller.abort(), 120000);

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
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF7F2] text-gray-900">
            <h1 className="text-2xl text-gray-400 mb-4">No survey data found.</h1>
            <button onClick={() => router.push('/survey')} className="text-[#D97B4A] underline underline-offset-4">
               Take the Survey
            </button>
        </div>
     );
  }

  // --- LOADING STATE ---
  if (isGenerating || genError) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] text-gray-900 flex flex-col items-center justify-center px-6">
         {!genError && (
           <div className="absolute top-0 left-0 w-full h-0.5 bg-gray-200">
              <motion.div
                 className="h-full bg-[#C89A7A]"
                 initial={{ width: "0%" }}
                 animate={{ width: "95%" }}
                 transition={{ duration: 60, ease: "easeOut" }}
              />
           </div>
         )}

         <div className="flex flex-col items-center justify-center text-center max-w-md">
             {genError ? (
               <>
                 <p className="text-lg text-gray-700 mb-2">Something went wrong</p>
                 <p className="text-gray-500 mb-8">{genError}</p>
                 <button
                   onClick={() => { setGenError(""); handleGenerate(); }}
                   className="px-6 py-3 bg-[#C89A7A] text-white rounded-full font-medium hover:bg-[#B88A6A] transition-colors"
                 >
                   Try Again
                 </button>
               </>
             ) : (
               <>
                 <Loader2 size={24} className="animate-spin text-[#D97B4A] mb-6" />
                 <h2 className="text-2xl font-medium mb-2 text-gray-900">
                    Crafting your itinerary
                 </h2>
                 <p className="text-gray-500">Finding the best stops across Canada. This may take up to a minute.</p>
               </>
             )}
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900 relative">

      {/* Left edge decoration */}
      <div
        className="fixed top-0 left-0 h-full w-[11vw] pointer-events-none z-0"
        style={{
          WebkitMaskImage: "linear-gradient(to right, rgba(0,0,0,0.22) 0%, transparent 100%)",
          maskImage: "linear-gradient(to right, rgba(0,0,0,0.22) 0%, transparent 100%)",
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
          WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.22) 0%, transparent 100%)",
          maskImage: "linear-gradient(to left, rgba(0,0,0,0.22) 0%, transparent 100%)",
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
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-2xl mx-auto px-6 py-16 md:py-24"
      >
        {/* Header */}
        <div className="mb-14">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-4">Your travel profile</p>
          <h1 className="text-3xl md:text-4xl font-medium leading-tight text-gray-900 mb-3">
            We matched you as
            <br />
            <span className="italic text-[#D97B4A]">{travellerArchetype}</span>
          </h1>
          <p className="text-gray-500 leading-relaxed">
            We think you&apos;d love {recommendedProvinces.slice(0, -1).join(", ")}
            {recommendedProvinces.length > 1 && ` and ${recommendedProvinces[recommendedProvinces.length - 1]}`}
            {recommendedProvinces.length === 1 && recommendedProvinces[0]}.
            {" "}Pick what interests you below to shape your itinerary.
          </p>
        </div>

        {/* Activities */}
        <div className="mb-14">
          <h2 className="text-lg font-medium mb-1 text-gray-900">Interests</h2>
          <p className="text-sm text-gray-400 mb-5">Tap all that appeal to you.</p>

          <div className="flex flex-wrap gap-2.5">
            {activityOptions.map((opt, i) => {
               const isSelected = activities.includes(opt.id);
               const Icon = opt.icon;

               return (
                  <motion.button
                     key={opt.id}
                     initial={{ opacity: 0, y: 8 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ duration: 0.3, delay: i * 0.03 }}
                     onClick={() => handleToggleActivity(opt.id)}
                     className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                        isSelected
                          ? "border-[#C89A7A] bg-[#C89A7A] text-white"
                          : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                     }`}
                  >
                     <Icon size={15} strokeWidth={isSelected ? 2.5 : 1.5} />
                     {opt.label}
                  </motion.button>
               );
            })}
          </div>
        </div>

        {/* Dream trip */}
        <div className="mb-16">
          <h2 className="text-lg font-medium mb-1 text-gray-900">Anything else?</h2>
          <p className="text-sm text-gray-400 mb-4">Optional. Tell us what you&apos;re dreaming of.</p>
          <textarea
            value={dreamTrip}
            onChange={(e) => setField("dreamTrip", e.target.value)}
            placeholder="I want to see a moose, avoid tourist traps, and find a great local brewery..."
            rows={3}
            className="w-full bg-white border border-gray-200 rounded-xl p-4 text-gray-900 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#D97B4A]/20 focus:border-[#D97B4A]/40 resize-none transition-colors placeholder:text-gray-400"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
               resetSurvey();
               router.push('/survey');
            }}
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RotateCcw size={14} />
            Start over
          </button>

          <button
            onClick={handleGenerate}
            disabled={activities.length === 0}
            className={`inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-medium transition-all duration-200 ${
               activities.length === 0
                 ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                 : "bg-[#C89A7A] text-white hover:bg-[#B88A6A] active:scale-[0.98] shadow-[0_4px_16px_rgba(200,154,122,0.3)]"
            }`}
          >
            <Sparkles size={15} />
            Generate Itinerary
            <ArrowRight size={15} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
