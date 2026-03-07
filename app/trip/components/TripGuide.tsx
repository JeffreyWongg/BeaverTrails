"use client";

import {
  Compass,
  X,
  Send,
  Volume2,
  VolumeX,
  Loader2,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSurveyStore } from "../../../lib/store";
import { Stop } from "../../../types";

interface Message {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

const STARTER_CHIPS = [
  "What should I pack for this trip?",
  "Which stop is most kid-friendly?",
  "What's the best season for this route?",
  "Are there any permit requirements I should know about?",
];

// Fuzzy-match a stop name from a string
function findStopByName(
  itinerary: ReturnType<typeof useSurveyStore.getState>["itinerary"],
  query: string
): Stop | null {
  const lower = query.toLowerCase();
  for (const day of itinerary) {
    for (const stop of day.stops || []) {
      if (lower.includes(stop.name.toLowerCase())) return stop;
    }
  }
  return null;
}

// Detect immersive intent patterns
function detectImmersiveIntent(
  text: string,
  itinerary: ReturnType<typeof useSurveyStore.getState>["itinerary"]
): { stop: Stop; time: string; season: string } | null {
  const lower = text.toLowerCase();

  const timeMap: Record<string, string> = {
    night: "Night",
    "at night": "Night",
    evening: "Dusk",
    dusk: "Dusk",
    dawn: "Dawn",
    morning: "Dawn",
    day: "Day",
    afternoon: "Day",
  };

  const seasonMap: Record<string, string> = {
    winter: "Winter",
    summer: "Summer",
    fall: "Fall",
    autumn: "Fall",
    spring: "Spring",
  };

  const patterns = [
    /what does (.+?) look like (?:at )?(\w+)/i,
    /show me (.+?) in (\w+)/i,
    /what is (.+?) like in (\w+)/i,
    /what(?:'s| is) (.+?) like (?:at )?(\w+)/i,
  ];

  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match) {
      const stopName = match[1];
      const contextWord = match[2].toLowerCase();
      const stop = findStopByName(itinerary, stopName);
      if (!stop) continue;

      const time = timeMap[contextWord] || null;
      const season = seasonMap[contextWord] || null;

      if (time || season) {
        return {
          stop,
          time: time || "Day",
          season: season || "Summer",
        };
      }
    }
  }

  return null;
}

interface TripGuideProps {
  onEnterImmersive: (stop: Stop, time: string, season: string) => void;
}

export function TripGuide({ onEnterImmersive }: TripGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { itinerary, travellerArchetype } = useSurveyStore();

  // Scroll to bottom when messages change
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

  const playVoice = useCallback(async (text: string) => {
    if (!voiceEnabled) return;
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stopName: "Trip Assistant",
          stopType: "other",
          stopNotes: text,
          timeOfDay: "Day",
          season: "Summer",
        }),
      });
      const contentType = res.headers.get("Content-Type") || "";
      if (contentType.includes("audio")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
      }
    } catch {
      // Voice playback failed silently
    }
  }, [voiceEnabled]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const trimmed = (text ?? input).trim();
      if (!trimmed || isLoading) return;

      const userMsg: Message = { role: "user", content: trimmed };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput("");
      setIsLoading(true);

      // Check for immersive intent
      const intent = detectImmersiveIntent(trimmed, itinerary);
      if (intent) {
        onEnterImmersive(intent.stop, intent.time, intent.season);
      }

      // Add placeholder for streaming response
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", isStreaming: true },
      ]);

      const trip = {
        id: "current-trip",
        title: "My BeaverTrails Trip",
        days: itinerary,
        travellerProfile: travellerArchetype || "",
        totalCostEstimate: 0,
      };

      try {
        const res = await fetch("/api/trip-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            trip,
            travelerProfile: travellerArchetype || "",
          }),
        });

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullContent = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine === "data: [DONE]") continue;
            if (trimmedLine.startsWith("data: ")) {
              try {
                const data = JSON.parse(trimmedLine.slice(6));
                if (data.token) {
                  fullContent += data.token;
                  setMessages((prev) => {
                    const newMsgs = [...prev];
                    const lastIdx = newMsgs.length - 1;
                    if (newMsgs[lastIdx]?.role === "assistant") {
                      newMsgs[lastIdx] = {
                        role: "assistant",
                        content: fullContent,
                        isStreaming: true,
                      };
                    }
                    return newMsgs;
                  });
                }
              } catch {
                // Skip
              }
            }
          }
        }

        // Mark streaming complete
        setMessages((prev) => {
          const newMsgs = [...prev];
          const lastIdx = newMsgs.length - 1;
          if (newMsgs[lastIdx]?.role === "assistant") {
            newMsgs[lastIdx] = { role: "assistant", content: fullContent };
          }
          return newMsgs;
        });

        // Play voice if enabled
        if (fullContent) {
          await playVoice(fullContent);
        }
      } catch {
        setMessages((prev) => {
          const newMsgs = [...prev];
          const lastIdx = newMsgs.length - 1;
          if (newMsgs[lastIdx]?.role === "assistant") {
            newMsgs[lastIdx] = {
              role: "assistant",
              content: "Sorry, I had trouble with that. Try again?",
            };
          }
          return newMsgs;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, itinerary, travellerArchetype, onEnterImmersive, playVoice]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const showStarters = messages.length === 0 && !isLoading;

  return (
    <div className="fixed bottom-6 right-24 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-4 w-[400px] h-[520px] bg-zinc-950 border border-red-900/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-red-950/30 p-4 border-b border-red-900/40 flex justify-between items-center backdrop-blur-md flex-shrink-0">
              <h3 className="font-bold text-red-100 flex items-center gap-2">
                <Compass size={16} className="text-red-400" />
                Trip Assistant
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setVoiceEnabled((v) => !v)}
                  title={voiceEnabled ? "Disable voice" : "Enable voice"}
                  className={`p-1.5 rounded-lg transition-colors ${
                    voiceEnabled
                      ? "text-red-400 bg-red-900/30"
                      : "text-zinc-500 hover:text-red-400"
                  }`}
                >
                  {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-red-500 hover:text-red-300 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 p-4 overflow-y-auto flex flex-col gap-3"
            >
              {showStarters && (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500 text-center">
                    Ask me anything about your trip 🍁
                  </p>
                  {STARTER_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => sendMessage(chip)}
                      className="w-full text-left text-sm px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-red-700/50 hover:text-white transition-all"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-sm p-3 rounded-xl max-w-[88%] ${
                    msg.role === "assistant"
                      ? "bg-zinc-800/60 text-zinc-300 self-start rounded-tl-sm border border-zinc-700/40"
                      : "bg-red-700/20 text-red-100 self-end rounded-tr-sm border border-red-700/30"
                  }`}
                >
                  {msg.content}
                  {msg.isStreaming && (
                    <span className="inline-block w-0.5 h-4 bg-red-400 ml-0.5 animate-pulse align-middle" />
                  )}
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role === "user" && (
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
                  placeholder="Ask about your trip…"
                  disabled={isLoading}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-700/50 transition-colors disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={isLoading || !input.trim()}
                  className="w-10 h-10 rounded-xl bg-red-700 hover:bg-red-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center transition-colors flex-shrink-0"
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
        className="w-14 h-14 rounded-full bg-red-700 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-700/20 transition-transform hover:scale-105 active:scale-95"
      >
        {isOpen ? <X size={22} /> : <Compass size={22} />}
      </button>
    </div>
  );
}
