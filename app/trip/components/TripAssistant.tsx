"use client";

import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSurveyStore } from "../../../lib/store";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface TripAssistantProps {
  onEnterImmersive?: (stop: import("../../../types").Stop, time: string, season: string) => void;
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TripAssistant({ onEnterImmersive: _onEnterImmersive }: TripAssistantProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [introSent, setIntroSent] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { itinerary, setField, travellerArchetype } = useSurveyStore();

  useEffect(() => {
    if (introSent || !itinerary || itinerary.length === 0) return;
    setIntroSent(true);

    const greeting: ChatMessage = {
      role: "assistant",
      content:
        "Hey! 🦫 I'm Beav — your personal trip buddy. Tell me if anything doesn't look right, or if you want to swap spots, skip a city, add a stop, whatever. I'll update your map in real time.",
    };

    const rationale = buildRationale(itinerary, travellerArchetype);
    const rationaleMsg: ChatMessage = { role: "assistant", content: rationale };

    setMessages([greeting, rationaleMsg]);
  }, [itinerary, travellerArchetype, introSent]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-3 w-[360px] h-[460px] bg-[#FAF7F2] border border-gray-200 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-gray-200 flex justify-between items-center flex-shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: "linear-gradient(135deg, #D97B4A, #C89A7A)" }}
                >
                  🦫
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 leading-none">Beav</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Your trip assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 px-4 py-4 overflow-y-auto flex flex-col gap-3"
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-sm p-3 rounded-xl max-w-[88%] leading-relaxed ${
                    msg.role === "assistant"
                      ? "bg-white text-gray-700 self-start rounded-tl-sm border border-gray-200 shadow-sm"
                      : "text-white self-end rounded-tr-sm shadow-sm"
                  }`}
                  style={
                    msg.role === "user"
                      ? { background: "linear-gradient(135deg, #D97B4A, #C89A7A)" }
                      : {}
                  }
                >
                  {msg.content}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-gray-400 text-sm p-3 self-start">
                  <Loader2 size={13} className="animate-spin" />
                  <span className="text-xs">Thinking…</span>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-gray-100 bg-white flex-shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder='e.g. "Remove Banff, I&apos;ve been there"'
                  disabled={isLoading}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D97B4A]/20 focus:border-[#D97B4A]/40 transition-colors disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-40 hover:scale-105 active:scale-95 flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #D97B4A, #C89A7A)" }}
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full text-white flex items-center justify-center shadow-[0_4px_20px_rgba(217,123,74,0.35)] transition-transform hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg, #D97B4A, #C89A7A)" }}
      >
        {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
      </button>
    </div>
  );
}
