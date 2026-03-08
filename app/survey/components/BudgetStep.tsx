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
      <h2 className="text-2xl font-semibold text-gray-900 mb-8 text-center">
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
                  ? "border-[#D97B4A] bg-[#D97B4A]/8 text-[#D97B4A]"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className={`font-semibold text-lg ${isSelected ? "text-[#D97B4A]" : ""}`}>
                {option.label}
              </span>
              <span className={`text-sm ${isSelected ? "text-[#D97B4A]/70" : "text-gray-400"}`}>
                {option.desc}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
