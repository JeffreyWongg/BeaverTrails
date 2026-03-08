"use client";

import { useSurveyStore } from "../../../lib/store";
import { motion } from "framer-motion";
import { Plus, Trash2, Music2, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function TikTokStep() {
  const { tiktokClips, setField } = useSurveyStore();
  const [analyzing, setAnalyzing] = useState<Record<number, boolean>>({});
  const debounceTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const handleAddClip = () => {
    const next = [...tiktokClips, { url: "", caption: "" }];
    setField("tiktokClips", next);
  };

  const handleUpdateClip = (index: number, field: "url" | "caption" | "summary", value: string) => {
    const next = [...tiktokClips];
    next[index] = { ...next[index], [field]: value };
    setField("tiktokClips", next);
  };

  const handleRemoveClip = (index: number) => {
    clearTimeout(debounceTimers.current[index]);
    const next = tiktokClips.filter((_, i) => i !== index);
    setField("tiktokClips", next);
    setAnalyzing((prev) => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  };

  const analyzeClip = async (index: number, url: string) => {
    setAnalyzing((prev) => ({ ...prev, [index]: true }));
    try {
      const res = await fetch("/api/summarize-tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.summary || data.location) {
        const next = [...useSurveyStore.getState().tiktokClips];
        next[index] = {
          ...next[index],
          summary: data.summary || "",
          caption: next[index].caption || data.location || "",
        };
        setField("tiktokClips", next);
      }
    } catch {
      // Silently fail — clip stays as-is
    } finally {
      setAnalyzing((prev) => ({ ...prev, [index]: false }));
    }
  };

  // Debounced analysis when URL changes
  useEffect(() => {
    tiktokClips.forEach((clip, index) => {
      if (!clip.url.includes("tiktok.com")) return;
      clearTimeout(debounceTimers.current[index]);
      debounceTimers.current[index] = setTimeout(() => {
        analyzeClip(index, clip.url);
      }, 800);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiktokClips.map((c) => c.url).join("|")]);

  const hasClips = tiktokClips.length > 0;

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      <div className="mb-6 p-4 bg-pink-500/10 rounded-full border border-pink-500/20">
        <Music2 size={40} className="text-pink-400" />
      </div>

      <h2 className="text-3xl font-bold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
        Bring in your TikTok inspo
      </h2>
      <p className="text-zinc-500 mb-8 text-center max-w-xl">
        Paste links to travel TikToks (like a hidden bar in Toronto or a scenic lookout in Banff). We&apos;ll build your route
        around the exact spots featured in your videos and weave them into your daily schedule.
      </p>

      <div className="w-full space-y-4">
        {hasClips ? (
          tiktokClips.map((clip, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-800 text-xs text-zinc-300 font-semibold">
                  {index + 1}
                </span>
                <input
                  type="url"
                  value={clip.url}
                  onChange={(e) => handleUpdateClip(index, "url", e.target.value)}
                  placeholder="TikTok link (e.g. https://www.tiktok.com/@creator/video/...)"
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-pink-500/60"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveClip(index)}
                  className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-500 transition-colors"
                  aria-label="Remove TikTok"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {analyzing[index] && (
                <div className="flex items-center gap-2 text-xs text-pink-400">
                  <Loader2 size={13} className="animate-spin" />
                  Analyzing TikTok...
                </div>
              )}

              {clip.summary && !analyzing[index] && (
                <div className="rounded-xl bg-pink-500/10 border border-pink-500/20 px-3 py-2">
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-pink-400 bg-pink-500/20 rounded-full px-2 py-0.5 mb-1">
                    AI Summary
                  </span>
                  <p className="text-xs text-zinc-300 leading-relaxed">{clip.summary}</p>
                </div>
              )}

              <textarea
                value={clip.caption || ""}
                onChange={(e) => handleUpdateClip(index, "caption", e.target.value)}
                placeholder={
                  clip.summary
                    ? "Override AI summary (optional)"
                    : "What does this TikTok show? Include the city, neighbourhood, and what you liked (e.g. 'Sunset at Humber Bay Park in Toronto, chill waterfront vibes, great skyline views')."
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-pink-500/60 resize-none min-h-[72px]"
              />
            </motion.div>
          ))
        ) : (
          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-dashed border-zinc-700 text-sm text-zinc-500 text-center">
            You can skip this if you don&apos;t have anything saved, but even one TikTok helps us anchor your trip around places
            you already love.
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleAddClip}
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-pink-500/50 text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 hover:border-pink-400 transition-colors text-sm font-medium"
      >
        <Plus size={16} />
        Add a TikTok
      </button>
    </div>
  );
}
