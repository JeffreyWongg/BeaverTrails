import { useSurveyStore } from "../../../lib/store";
import { motion } from "framer-motion";
import { UserCircle, Heart, UsersRound, Beer } from "lucide-react";

export function GroupCompositionStep() {
  const { groupComposition, setField } = useSurveyStore();

  const options = [
    { value: "Solo", label: "Going Solo", desc: "Finding myself on the trail", icon: UserCircle },
    { value: "Couple", label: "Couple Retreat", desc: "Romantic getaway", icon: Heart },
    { value: "Family", label: "Family Vacation", desc: "Making memories together", icon: UsersRound },
    { value: "Friends", label: "Friends Group", desc: "Adventure with the squad", icon: Beer },
  ];

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
        Who&apos;s traveling?
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {options.map((option, idx) => {
          const isSelected = groupComposition === option.value;
          const Icon = option.icon;

          return (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, ease: "easeOut" }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setField("groupComposition", option.value)}
              className={`p-6 rounded-2xl flex flex-col items-center text-center gap-3 border transition-all ${
                isSelected
                  ? "border-canada-red bg-canada-red-muted text-white shadow-[0_0_15px_rgba(200,16,46,0.2)]"
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800"
              }`}
            >
              <Icon size={48} className={isSelected ? "text-canada-red-light mb-2" : "text-zinc-600 mb-2"} />
              <span className="font-bold text-xl text-white">{option.label}</span>
              <span className={`text-sm ${isSelected ? "text-zinc-300" : "text-zinc-500"}`}>{option.desc}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
