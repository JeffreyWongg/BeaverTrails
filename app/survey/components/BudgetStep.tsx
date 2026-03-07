import { useSurveyStore } from "../../../lib/store";
import { motion } from "framer-motion";

export function BudgetStep() {
  const { budgetPerPerson, setField } = useSurveyStore();

  const options = [
    { value: "Budget ($50-100)", label: "Budget", desc: "$50-$100 / day", color: "text-emerald-400", bg: "bg-emerald-500/20", border: "border-emerald-500", glow: "shadow-[0_0_15px_rgba(16,185,129,0.2)]" },
    { value: "Mid ($100-250)", label: "Mid-Range", desc: "$100-$250 / day", color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500", glow: "shadow-[0_0_15px_rgba(59,130,246,0.2)]" },
    { value: "Luxury ($250+)", label: "Luxury", desc: "$250+ / day", color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500", glow: "shadow-[0_0_15px_rgba(168,85,247,0.2)]" },
  ];

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
        What is your budget per person?
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {options.map((option, idx) => {
          const isSelected = budgetPerPerson === option.value;

          return (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setField("budgetPerPerson", option.value)}
              className={`p-8 rounded-2xl flex flex-col items-center text-center gap-2 border transition-all ${
                isSelected
                  ? `${option.border} ${option.bg} ${option.color} ${option.glow}`
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800"
              }`}
            >
              <span className={`font-bold text-2xl ${isSelected ? option.color : "text-white"}`}>
                {option.label}
              </span>
              <span className={`text-base font-medium ${isSelected ? "opacity-80" : "text-zinc-500"}`}>
                {option.desc}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
