import { useSurveyStore } from "../../../lib/store";
import { motion } from "framer-motion";
import { Accessibility, Eye, WheatOff, PersonStanding } from "lucide-react";

export function AccessibilityStep() {
  const { accessibilityNeeds, setField } = useSurveyStore();

  const options = [
    { value: "Mobility", label: "Mobility Support", icon: Accessibility },
    { value: "Visual", label: "Visual Aids", icon: Eye },
    { value: "Dietary", label: "Dietary Restrictions", icon: WheatOff },
    { value: "None", label: "None / Not Applicable", icon: PersonStanding },
  ];

  const handleToggle = (value: string) => {
    if (value === "None") {
      setField("accessibilityNeeds", ["None"]);
      return;
    }

    let nextNeeds = accessibilityNeeds.filter(n => n !== "None");

    if (nextNeeds.includes(value)) {
      nextNeeds = nextNeeds.filter(n => n !== value);
    } else {
      nextNeeds.push(value);
    }

    setField("accessibilityNeeds", nextNeeds);
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-3xl font-bold mb-2 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
        Any accessibility or special requirements?
      </h2>
      <p className="text-zinc-500 mb-8 text-center">Select all that apply</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {options.map((option, idx) => {
          const isSelected = accessibilityNeeds.includes(option.value);
          const Icon = option.icon;

          return (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleToggle(option.value)}
              className={`p-5 rounded-xl flex items-center gap-4 border transition-all text-left ${
                isSelected
                  ? "border-canada-red bg-canada-red-muted text-white shadow-[0_0_15px_rgba(200,16,46,0.15)]"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800"
              }`}
            >
              <div className={`p-3 rounded-full ${isSelected ? 'bg-canada-red/20' : 'bg-zinc-800'}`}>
                 <Icon size={24} className={isSelected ? "text-canada-red-light" : "text-zinc-500"} />
              </div>
              <span className="font-medium text-lg flex-1">{option.label}</span>

              <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                isSelected ? "border-canada-red bg-canada-red" : "border-zinc-600"
              }`}>
                {isSelected && (
                   <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                   </motion.svg>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
