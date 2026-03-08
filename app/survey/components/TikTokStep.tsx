"use client";

import { useSurveyStore } from "../../../lib/store";
import { motion } from "framer-motion";
import { Plus, Trash2, Loader2 } from "lucide-react";
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
      <h2 className="text-2xl font-semibold text-white mb-2 text-center">
        Got any TikTok inspo?
      </h2>
      <p className="text-zinc-500 mb-8 text-center text-sm max-w-lg">
        Paste links to travel TikToks and we&apos;ll weave those spots into your route. Optional.
      </p>

      <div className="w-full space-y-3">
        {hasClips ? (
          tiktokClips.map((clip, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-xs text-zinc-400 font-medium">
                  {index + 1}
                </span>
                <input
                  type="url"
                  value={clip.url}
                  onChange={(e) => handleUpdateClip(index, "url", e.target.value)}
                  placeholder="Paste TikTok link..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveClip(index)}
                  className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                  aria-label="Remove TikTok"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {analyzing[index] && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Loader2 size={12} className="animate-spin" />
                  Analyzing...
                </div>
              )}

              {clip.summary && !analyzing[index] && (
                <div className="rounded-lg bg-white/5 border border-zinc-800 px-3 py-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1 block">
                    Summary
                  </span>
                  <p className="text-xs text-zinc-300 leading-relaxed">{clip.summary}</p>
                </div>
              )}

              <textarea
                value={clip.caption || ""}
                onChange={(e) => handleUpdateClip(index, "caption", e.target.value)}
                placeholder={
                  clip.summary
                    ? "Override summary (optional)"
                    : "Describe the spot — city, neighbourhood, what you liked..."
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-600 resize-none min-h-[64px]"
              />
            </motion.div>
          ))
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-sm text-zinc-500 text-center">
            No TikToks added. You can skip this step.
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleAddClip}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-zinc-900 transition-all text-sm font-medium"
      >
        <Plus size={15} />
        Add a TikTok
      </button>
    </div>
  );
}
