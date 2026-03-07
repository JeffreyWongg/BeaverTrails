"use client";

import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSurveyStore } from "../../../lib/store";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildRationale(itinerary: import("../../../types").Day[], archetype: string | null): string {
  if (!itinerary || itinerary.length === 0) return "";

  const cities = Array.from(new Set(itinerary.map((d) => d.city)));
  const provinces = Array.from(new Set(itinerary.map((d) => d.province)));
  const allStops = itinerary.flatMap((d) => d.stops || []);
  const gems = allStops.filter((s) => s.type !== "attraction").slice(0, 3);
  const flights = itinerary.filter((d) => d.travel_method_from_prev === "flight").length;

  let msg = `Here's why I picked this route: You're hitting ${cities.length} spots across ${provinces.join(" & ")}`;
  if (archetype) msg += `, tailored for a ${archetype}`;
  msg += `. `;

  if (flights === 0) {
    msg += `It's all driveable — no flights needed. `;
  } else {
    msg += `${flights === 1 ? "Just 1 flight" : `${flights} flights`} where driving wasn't practical. `;
  }

  if (gems.length > 0) {
    msg += `I mixed in local spots like ${gems.map((g) => g.name).join(", ")} alongside the highlights.`;
  }

  return msg;
}

export function TripAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [introSent, setIntroSent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { itinerary, setField, travellerArchetype } = useSurveyStore();

  // Build intro messages once the itinerary is loaded
  useEffect(() => {
    if (introSent || !itinerary || itinerary.length === 0) return;
    setIntroSent(true);

    const greeting: ChatMessage = {
      role: "assistant",
      content: "Hey! 🦫 I'm Beav — your personal trip buddy. Tell me if anything doesn't look right, or if you want to swap spots, skip a city, add a stop, whatever. I'll update your map in real time.",
    };

    const rationale = buildRationale(itinerary, travellerArchetype);
    const rationaleMsg: ChatMessage = {
      role: "assistant",
      content: rationale,
    };

    setMessages([greeting, rationaleMsg]);
  }, [itinerary, travellerArchetype, introSent]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          itinerary,
          history: newMessages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      const botMsg: ChatMessage = {
        role: "assistant",
        content: data.message || "Done! I've updated your itinerary.",
      };
      setMessages((prev) => [...prev, botMsg]);

      // If the AI returned an updated itinerary, apply it in real time
      if (data.itinerary && Array.isArray(data.itinerary) && data.itinerary.length > 0) {
        setField("itinerary", data.itinerary);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Try again?" },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, itinerary, setField]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-4 w-96 h-[480px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-zinc-900 p-4 border-b border-zinc-800 flex justify-between items-center backdrop-blur-md flex-shrink-0">
              <h3 className="font-bold text-white flex items-center gap-2">
                <MessageSquare size={16} className="text-canada-red-light" />
                Beav
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-sm p-3 rounded-xl max-w-[85%] ${
                    msg.role === "assistant"
                      ? "bg-zinc-800/60 text-zinc-300 self-start rounded-tl-sm border border-zinc-700/40"
                      : "bg-canada-red-muted text-white self-end rounded-tr-sm border border-canada-red/30"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-zinc-500 text-sm p-3 self-start">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. &quot;Remove Banff, I've been there&quot;"
                  disabled={isLoading}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-canada-red/40 transition-colors disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  className="w-10 h-10 rounded-xl bg-canada-red hover:bg-canada-red-light disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-canada-red hover:bg-canada-red-light text-white flex items-center justify-center shadow-lg shadow-canada-red/20 transition-transform hover:scale-105 active:scale-95"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
}
