import { useSurveyStore } from "../../../lib/store";
import { motion } from "framer-motion";
import { UserCircle, Heart, UsersRound, Beer } from "lucide-react";

export function GroupCompositionStep() {
  const { groupComposition, setField } = useSurveyStore();

  const options = [
    { value: "Solo", label: "Solo", icon: UserCircle },
    { value: "Couple", label: "Couple", icon: Heart },
    { value: "Family", label: "Family", icon: UsersRound },
    { value: "Friends", label: "Friends", icon: Beer },
  ];

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-semibold text-gray-900 mb-8 text-center">
        Who&apos;s traveling?
      </h2>
      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {options.map((option, idx) => {
          const isSelected = groupComposition === option.value;
          const Icon = option.icon;

          return (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setField("groupComposition", option.value)}
              className={`p-6 rounded-xl flex flex-col items-center gap-3 border transition-all ${
                isSelected
                  ? "border-[#D97B4A] bg-[#D97B4A]/8 text-[#D97B4A]"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Icon size={28} className={isSelected ? "text-[#D97B4A]" : "text-gray-400"} />
              <span className="font-medium">{option.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
