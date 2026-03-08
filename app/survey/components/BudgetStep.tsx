import { useSurveyStore } from "../../../lib/store";
import { motion } from "framer-motion";

export function BudgetStep() {
  const { budgetPerPerson, setField } = useSurveyStore();

  const options = [
    { value: "Budget ($50-100)", label: "Budget", desc: "$50 - $100 / day" },
    { value: "Mid ($100-250)", label: "Mid-Range", desc: "$100 - $250 / day" },
    { value: "Luxury ($250+)", label: "Luxury", desc: "$250+ / day" },
  ];

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-semibold text-white mb-8 text-center">
        What is your budget per person?
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
        {options.map((option, idx) => {
          const isSelected = budgetPerPerson === option.value;

          return (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setField("budgetPerPerson", option.value)}
              className={`p-6 rounded-xl flex flex-col items-center text-center gap-1 border transition-all ${
                isSelected
                  ? "border-white bg-white/5 text-white"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-900"
              }`}
            >
              <span className={`font-semibold text-lg ${isSelected ? "text-white" : ""}`}>
                {option.label}
              </span>
              <span className={`text-sm ${isSelected ? "text-zinc-300" : "text-zinc-500"}`}>
                {option.desc}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
