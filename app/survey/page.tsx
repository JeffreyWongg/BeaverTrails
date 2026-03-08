"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSurveyStore } from "../../lib/store";
import { AgeRangeStep } from "./components/AgeRangeStep";
import { AccessibilityStep } from "./components/AccessibilityStep";
import { GroupCompositionStep } from "./components/GroupCompositionStep";
import { TripDurationStep } from "./components/TripDurationStep";
import { BudgetStep } from "./components/BudgetStep";
import { LuggageStep } from "./components/LuggageStep";
import { StartingCityStep } from "./components/StartingCityStep";
import { TikTokStep } from "./components/TikTokStep";
import SurveyGlobe from "./components/SurveyGlobe";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Loader2, Check } from "lucide-react";

const TOTAL_STEPS = 8;

export default function SurveyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  
  const surveyState = useSurveyStore();

  const handleNext = async () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Submit survey
      setIsSubmitting(true);
      try {
        const payload = {
          ageRange: surveyState.ageRange,
          accessibilityNeeds: surveyState.accessibilityNeeds,
          groupComposition: surveyState.groupComposition,
          tripDuration: surveyState.tripDuration,
          budgetPerPerson: surveyState.budgetPerPerson,
          luggageAmount: surveyState.luggageAmount,
          startingCity: surveyState.startingCity,
          tiktokClips: surveyState.tiktokClips,
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        const response = await fetch("/api/analyze-survey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
           const data = await response.json();
           surveyState.setField("travellerArchetype", data.traveller_archetype);
           surveyState.setField("recommendedProvinces", data.recommended_provinces);

           if (surveyState.tiktokClips.length > 0) {
             const s = useSurveyStore.getState();
             const itineraryPayload = {
               ageRange: s.ageRange,
               accessibilityNeeds: s.accessibilityNeeds,
               groupComposition: s.groupComposition,
               tripDuration: s.tripDuration,
               budgetPerPerson: s.budgetPerPerson,
               luggageAmount: s.luggageAmount,
               startingCity: s.startingCity,
               travellerArchetype: data.traveller_archetype,
               recommendedProvinces: data.recommended_provinces,
               activities: s.activities,
               dreamTrip: s.dreamTrip,
               tiktokClips: s.tiktokClips,
             };

             const itinController = new AbortController();
             const itinTimeout = setTimeout(() => itinController.abort(), 120000);

             const itinResponse = await fetch("/api/generate-itinerary", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify(itineraryPayload),
               signal: itinController.signal,
             });

             clearTimeout(itinTimeout);

             if (itinResponse.ok) {
               const itinerary = await itinResponse.json();
               surveyState.setField("itinerary", itinerary);
               router.push("/trip");
             } else {
               console.error("Failed to generate itinerary:", itinResponse.status);
               router.push("/preferences");
             }
           } else {
             router.push("/preferences");
           }
        } else {
           const errorData = await response.text();
           console.error("Survey submission failed:", response.status, errorData);
           setIsSubmitting(false);
        }
      } catch (error) {
        console.error("Error submitting survey", error);
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const isNextDisabled = () => {
    switch (currentStep) {
      case 1: return !surveyState.ageRange;
      case 2: return surveyState.accessibilityNeeds.length === 0;
      case 3: return !surveyState.groupComposition;
      case 4: return false;
      case 5: return !surveyState.budgetPerPerson;
      case 6: return !surveyState.luggageAmount;
      case 7: return !surveyState.startingCity;
      case 8: return false;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900 flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Background auto-rotating globe */}
      <SurveyGlobe />

      {/* Floating survey card */}
      <div className="relative z-10 w-full max-w-3xl bg-white rounded-3xl border border-gray-200/80 shadow-[0_4px_40px_rgba(0,0,0,0.06)] px-8 py-8 sm:px-10">
        {/* Progress Circles */}
        <div className="mb-12">
          <div className="flex items-center justify-between w-full">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => {
              const step = i + 1;
              const isCompleted = step < currentStep;
              const isCurrent = step === currentStep;
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1 : 1,
                      borderColor: isCompleted || isCurrent ? "#C89A7A" : "#d1d5db",
                      backgroundColor: isCompleted ? "#C89A7A" : "transparent",
                    }}
                    transition={{ duration: 0.3 }}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isCurrent ? "border-[#C89A7A]" : ""
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={14} className="text-white" strokeWidth={3} />
                    ) : (
                      <span className={`text-xs font-medium ${isCurrent ? "text-[#C89A7A]" : "text-gray-400"}`}>
                        {step}
                      </span>
                    )}
                  </motion.div>
                  {step < TOTAL_STEPS && (
                    <div className="flex-1 h-px mx-2">
                      <motion.div
                        initial={false}
                        animate={{
                          backgroundColor: isCompleted ? "#C89A7A" : "#e5e7eb",
                        }}
                        transition={{ duration: 0.3 }}
                        className="h-full w-full"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Survey Component Container */}
        <div className="min-h-[400px] flex flex-col justify-center relative">
          <AnimatePresence mode="wait">
             <motion.div
               key={currentStep}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               transition={{ duration: 0.3, ease: "easeInOut" }}
               className="w-full"
             >
                {currentStep === 1 && <AgeRangeStep />}
                {currentStep === 2 && <AccessibilityStep />}
                {currentStep === 3 && <GroupCompositionStep />}
                {currentStep === 4 && <TripDurationStep />}
                {currentStep === 5 && <BudgetStep />}
                {currentStep === 6 && <LuggageStep />}
                {currentStep === 7 && <StartingCityStep />}
                {currentStep === 8 && <TikTokStep />}
             </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Controls */}
        <div className="mt-12 flex justify-between items-center">
           <button
             onClick={handleBack}
             disabled={currentStep === 1 || isSubmitting}
             className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
               currentStep === 1 || isSubmitting
                ? "opacity-0 pointer-events-none" 
                : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
             }`}
           >
             <ChevronLeft size={20} />
             Back
           </button>

           <button
             onClick={handleNext}
             disabled={isNextDisabled() || isSubmitting}
             className={`flex items-center gap-2 px-8 py-3 rounded-full font-medium shadow-lg transition-all transform ${
               isNextDisabled()
                 ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                 : "bg-[#C89A7A] text-white hover:bg-[#B88A6A] hover:scale-105 active:scale-95 shadow-[0_4px_16px_rgba(200,154,122,0.3)]"
             }`}
           >
             {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  {surveyState.tiktokClips.length > 0 ? "Building your trip..." : "Analyzing..."}
                </>
             ) : (
                <>
                  {currentStep === TOTAL_STEPS ? "Discover Your Trail" : "Continue"}
                  {!isSubmitting && <ChevronRight size={20} />}
                </>
             )}
           </button>
        </div>
      </div>
    </div>
  );
}
