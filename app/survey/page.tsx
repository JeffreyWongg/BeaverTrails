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
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Loader2 } from "lucide-react";

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
        const timeout = setTimeout(() => controller.abort(), 45000); // 45s client timeout

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
           router.push("/preferences");
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
      case 4: return false; // Slider always has a value
      case 5: return !surveyState.budgetPerPerson;
      case 6: return !surveyState.luggageAmount;
      case 7: return !surveyState.startingCity;
      case 8: return false;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Background blobs for aesthetic */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-2xl z-10">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex justify-between text-sm text-zinc-400 mb-2 font-medium">
            <span>Step {currentStep} of {TOTAL_STEPS}</span>
            <span>{Math.round((currentStep / TOTAL_STEPS) * 100)}% Complete</span>
          </div>
          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
             <motion.div 
               className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
               initial={{ width: 0 }}
               animate={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
               transition={{ duration: 0.5, ease: "easeInOut" }}
             />
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
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
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
                 ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                 : "bg-white text-zinc-950 hover:bg-zinc-200 hover:scale-105 active:scale-95"
             }`}
           >
             {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Analyzing...
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
