import { useSurveyStore } from "../../../lib/store";
import { motion } from "framer-motion";
import { User, Users, Baby } from "lucide-react";

export function AgeRangeStep() {
  const { ageRange, setField } = useSurveyStore();

  const options = [
    { value: "18-25", label: "18-25", icon: User },
    { value: "26-35", label: "26-35", icon: User },
    { value: "36-50", label: "36-50", icon: Users },
    { value: "51-65", label: "51-65", icon: Users },
    { value: "65+", label: "65+", icon: Baby },
  ];

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
        What is your age range?
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
        {options.map((option, idx) => {
          const isSelected = ageRange === option.value;
          const Icon = option.icon;

          return (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setField("ageRange", option.value)}
              className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-3 border transition-all ${
                isSelected
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800"
              }`}
            >
              <Icon size={32} className={isSelected ? "text-emerald-400" : "text-zinc-500"} />
              <span className="font-medium text-lg">{option.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
