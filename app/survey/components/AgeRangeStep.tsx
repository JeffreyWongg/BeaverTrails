import { useSurveyStore } from "../../../lib/store";
import { motion } from "framer-motion";

export function AgeRangeStep() {
  const { ageRange, setField } = useSurveyStore();

  const options = ["18-25", "26-35", "36-50", "51-65", "65+"];

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-semibold text-gray-900 mb-8 text-center">
        What is your age range?
      </h2>
      <div className="flex flex-wrap justify-center gap-3 w-full">
        {options.map((option, idx) => {
          const isSelected = ageRange === option;

          return (
            <motion.button
              key={option}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setField("ageRange", option)}
              className={`px-6 py-3 rounded-full border transition-all font-medium ${
                isSelected
                  ? "border-[#D97B4A] bg-[#D97B4A]/8 text-[#D97B4A]"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {option}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
