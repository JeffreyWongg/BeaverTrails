import { useSurveyStore } from "../../../lib/store";
import { motion } from "framer-motion";
import { Briefcase, Backpack, Luggage } from "lucide-react";

export function LuggageStep() {
  const { luggageAmount, setField } = useSurveyStore();

  const options = [
    { value: "Backpack", label: "Backpack Only", icon: Backpack },
    { value: "Carry-on", label: "Carry-on", icon: Briefcase },
    { value: "Checked", label: "Checked Bags", icon: Luggage },
  ];

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
        How much luggage are you bringing?
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">
        {options.map((option, idx) => {
          const isSelected = luggageAmount === option.value;
          const Icon = option.icon;

          return (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setField("luggageAmount", option.value)}
              className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-4 border transition-all ${
                isSelected
                  ? "border-rose-500 bg-rose-500/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800"
              }`}
            >
              <Icon size={48} className={isSelected ? "text-rose-400" : "text-zinc-500"} />
              <span className="font-semibold text-xl">{option.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
