import { useSurveyStore } from "../../../lib/store";
import { motion } from "framer-motion";
import { Accessibility, Eye, WheatOff, PersonStanding } from "lucide-react";

export function AccessibilityStep() {
  const { accessibilityNeeds, setField } = useSurveyStore();

  const options = [
    { value: "Mobility", label: "Mobility Support", icon: Accessibility },
    { value: "Visual", label: "Visual Aids", icon: Eye },
    { value: "Dietary", label: "Dietary Restrictions", icon: WheatOff },
    { value: "None", label: "None", icon: PersonStanding },
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
      <h2 className="text-2xl font-semibold text-white mb-2 text-center">
        Any accessibility needs?
      </h2>
      <p className="text-zinc-500 mb-8 text-center text-sm">Select all that apply</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {options.map((option, idx) => {
          const isSelected = accessibilityNeeds.includes(option.value);
          const Icon = option.icon;

          return (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleToggle(option.value)}
              className={`p-4 rounded-xl flex items-center gap-4 border transition-all text-left ${
                isSelected
                  ? "border-white bg-white/5 text-white"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-900"
              }`}
            >
              <Icon size={20} className={isSelected ? "text-white" : "text-zinc-500"} />
              <span className="font-medium flex-1">{option.label}</span>

              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                isSelected ? "border-white bg-white" : "border-zinc-600"
              }`}>
                {isSelected && (
                   <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-3 h-3 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
