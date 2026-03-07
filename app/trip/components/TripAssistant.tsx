"use client";

import { MessageSquare, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function TripAssistant() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
       <AnimatePresence>
          {isOpen && (
             <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="mb-4 w-80 h-96 bg-zinc-950 border border-emerald-900/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
             >
                <div className="bg-emerald-900/30 p-4 border-b border-emerald-900/50 flex justify-between items-center backdrop-blur-md">
                   <h3 className="font-bold text-emerald-100 flex items-center gap-2">
                       <MessageSquare size={16} className="text-emerald-400" />
                       Trip Assistant
                   </h3>
                   <button onClick={() => setIsOpen(false)} className="text-emerald-500 hover:text-emerald-300 transition-colors">
                      <X size={18} />
                   </button>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
                   <div className="bg-zinc-800/50 text-zinc-300 text-sm p-3 rounded-lg rounded-tl-sm w-[85%] self-start border border-zinc-700/50">
                      Hi there! Im your BeaverTrails guide. Need recommendations for restaurants along your route?
                   </div>
                </div>

                <div className="p-3 border-t border-zinc-800 bg-zinc-950">
                   <input 
                      type="text" 
                      placeholder="Ask anything..." 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                   />
                </div>
             </motion.div>
          )}
       </AnimatePresence>

       <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-transform hover:scale-105 active:scale-95"
       >
          {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
       </button>
    </div>
  );
}
