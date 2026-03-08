import { useSurveyStore } from "../../../lib/store";
import { motion } from "framer-motion";
import { Briefcase, Backpack, Luggage } from "lucide-react";

export function LuggageStep() {
  const { luggageAmount, setField } = useSurveyStore();

  const options = [
    { value: "Backpack", label: "Backpack", icon: Backpack },
    { value: "Carry-on", label: "Carry-on", icon: Briefcase },
    { value: "Checked", label: "Checked Bags", icon: Luggage },
  ];

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-semibold text-white mb-8 text-center">
        How much luggage?
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
        {options.map((option, idx) => {
          const isSelected = luggageAmount === option.value;
          const Icon = option.icon;

          return (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setField("luggageAmount", option.value)}
              className={`p-6 rounded-xl flex flex-col items-center gap-3 border transition-all ${
                isSelected
                  ? "border-white bg-white/5 text-white"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-900"
              }`}
            >
              <Icon size={28} className={isSelected ? "text-white" : "text-zinc-500"} />
              <span className="font-medium">{option.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
