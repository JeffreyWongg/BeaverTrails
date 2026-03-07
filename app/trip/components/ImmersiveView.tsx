"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Mic, MicOff, Volume2, VolumeX, ChevronLeft, ChevronRight } from "lucide-react";
import { useSurveyStore } from "../../../lib/store";
import { Stop } from "../../../types";
import { getStopKey } from "../../../lib/streetView";

// Ambient sound URLs (replace with actual hosted audio files)
// TODO: Host proper ambient audio files and update these URLs
const AMBIENT_SOUNDS: Record<string, string> = {
  park: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  mountain: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  beach: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  restaurant: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  market: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  historic: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  museum: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  attraction: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  default: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
};

const TIME_FILTERS: Record<string, string> = {
  Dawn: "sepia(0.5) hue-rotate(-20deg) brightness(0.8) blur(0px) saturate(1.2)",
  Day: "none",
  Dusk: "sepia(0.4) hue-rotate(10deg) contrast(1.1) brightness(0.85)",
  Night: "brightness(0.4) saturate(0.3) hue-rotate(200deg)",
};

const SEASON_FILTERS: Record<string, string> = {
  Spring: "hue-rotate(-5deg) brightness(1.05) saturate(1.2)",
  Summer: "none",
  Fall: "sepia(0.2) hue-rotate(15deg) saturate(1.1)",
  Winter: "saturate(0.4) brightness(1.1) hue-rotate(180deg)",
};

interface ImmersiveViewProps {
  stop: Stop;
  initialTime: string;
  initialSeason: string;
  stops: Stop[];
  initialIndex: number;
  onClose: () => void;
}

export function ImmersiveView({
  stop: initialStop,
  initialTime,
  initialSeason,
  stops,
  initialIndex,
  onClose,
}: ImmersiveViewProps) {
  const streetViewRef = useRef<HTMLDivElement>(null);
  const mapboxRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const narrationAudioRef = useRef<HTMLAudioElement | null>(null);
  const narrationAbortRef = useRef<AbortController | null>(null);
  const mapboxMapRef = useRef<unknown>(null);
  const bearingAnimRef = useRef<number | null>(null);

  const [timeOfDay, setTimeOfDay] = useState(initialTime || "Day");
  const [season, setSeason] = useState(initialSeason || "Summer");
  const [isNarrating, setIsNarrating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [muteAmbient, setMuteAmbient] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [textQuestion, setTextQuestion] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [currentStop, setCurrentStop] = useState<Stop>(initialStop);
  const [narrationScript, setNarrationScript] = useState<string | null>(null);
  const isFirstRender = useRef(true);

  const { streetViewCoverage, narrationScripts, immersiveChatHistory, setField } = useSurveyStore();

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setCurrentStop(initialStop);
  }, [initialIndex, initialStop]);

  const stopKey =
    currentStop.id ||
    `${currentStop.name}_${currentStop.coordinates[0].toFixed(4)}_${currentStop.coordinates[1].toFixed(4)}`;
  const svAvailable = streetViewCoverage[stopKey] === true;
  const chatHistory = immersiveChatHistory[stopKey] || [];

  // Combined CSS filter
  const combinedFilter = () => {
    const tf = TIME_FILTERS[timeOfDay] || "none";
    const sf = SEASON_FILTERS[season] || "none";
    if (tf === "none" && sf === "none") return "none";
    if (tf === "none") return sf;
    if (sf === "none") return tf;
    return `${tf} ${sf}`;
  };

  // Initialize ambient audio
  useEffect(() => {
    const soundKey = Object.keys(AMBIENT_SOUNDS).find((k) =>
      currentStop.type.toLowerCase().includes(k)
    ) || "default";
    const url = AMBIENT_SOUNDS[soundKey];

    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;

    audio.play().catch(() => {});

    // Fade in over 1.5s
    let vol = 0;
    const fadeIn = setInterval(() => {
      vol = Math.min(vol + 0.035, 0.35);
      audio.volume = vol;
      if (vol >= 0.35) clearInterval(fadeIn);
    }, 50);

    return () => {
      clearInterval(fadeIn);
      // Fade out on unmount
      let v = audio.volume;
      const fadeOut = setInterval(() => {
        v = Math.max(v - 0.05, 0);
        audio.volume = v;
        if (v <= 0) {
          clearInterval(fadeOut);
          audio.pause();
          audio.src = "";
        }
      }, 50);
    };
  }, [currentStop.type]);

  // Mute/unmute ambient
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muteAmbient ? 0 : 0.35;
    }
  }, [muteAmbient]);

  // Initialize Street View panorama
  useEffect(() => {
    if (!svAvailable || !streetViewRef.current) return;

    const initPanorama = () => {
      if (!streetViewRef.current) return;
      try {
        new google.maps.StreetViewPanorama(streetViewRef.current, {
          position: { lat: currentStop.coordinates[1], lng: currentStop.coordinates[0] },
          pov: { heading: 0, pitch: 0 },
          zoom: 1,
          disableDefaultUI: true,
          clickToGo: false,
          motionTracking: false,
        });
      } catch {
        // StreetView not available
      }
    };

    if (window.google?.maps?.StreetViewPanorama) {
      initPanorama();
    } else {
      import("@googlemaps/js-api-loader").then(({ setOptions, importLibrary }) => {
        setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "" });
        importLibrary("maps").then(initPanorama).catch(() => {});
      });
    }

    return () => {};
  }, [svAvailable, currentStop]);

  // Initialize Mapbox fallback
  useEffect(() => {
    if (svAvailable || !mapboxRef.current) return;

    let map: unknown = null;
    let animId: number | null = null;

    import("mapbox-gl").then((mapboxgl) => {
      mapboxgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
      if (!mapboxRef.current) return;

      const mapInstance = new mapboxgl.default.Map({
        container: mapboxRef.current,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: currentStop.coordinates,
        zoom: 16,
        pitch: 70,
        bearing: 0,
      });

      mapboxMapRef.current = mapInstance;
      map = mapInstance;

      let bearing = 0;
      const rotate = () => {
        bearing = (bearing + 0.1) % 360;
        mapInstance.setBearing(bearing);
        animId = requestAnimationFrame(rotate);
      };
      mapInstance.on("load", () => {
        animId = requestAnimationFrame(rotate);
      });
    });

    return () => {
      if (animId !== null) cancelAnimationFrame(animId);
      if (map && typeof (map as { remove: () => void }).remove === "function") {
        (map as { remove: () => void }).remove();
      }
    };
  }, [svAvailable, currentStop]);

  // Fetch and play narration
  const playNarration = useCallback(
    async (time: string, sea: string) => {
      // Cancel any in-flight narration request
      narrationAbortRef.current?.abort();
      const abortController = new AbortController();
      narrationAbortRef.current = abortController;

      setIsNarrating(true);
      try {
        const cacheKey = `${getStopKey(currentStop)}_${time}_${sea}`;
        const cachedText = narrationScripts[cacheKey];

        // Show cached text immediately if available
        if (cachedText) setNarrationScript(cachedText);

        const res = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            stopName: currentStop.name,
            stopType: currentStop.type,
            stopNotes: currentStop.notes || currentStop.description || "",
            timeOfDay: time,
            season: sea,
            preGeneratedText: cachedText || undefined,
          }),
        });

        if (narrationAudioRef.current) {
          narrationAudioRef.current.pause();
        }

        const contentType = res.headers.get("Content-Type") || "";
        if (contentType.includes("audio")) {
          const textHeader = res.headers.get("X-Narration-Text");
          const generatedText = textHeader ? decodeURIComponent(textHeader) : cachedText || null;
          if (generatedText) setNarrationScript(generatedText);
          // Save newly generated script to cache
          if (generatedText && !cachedText) {
            setField("narrationScripts", { ...narrationScripts, [cacheKey]: generatedText });
          }
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          narrationAudioRef.current = audio;
          audio.onended = () => {
            setIsNarrating(false);
            URL.revokeObjectURL(url);
          };
          await audio.play();
        } else {
          const data = await res.json().catch(() => ({}));
          const generatedText = data.text || null;
          if (generatedText) setNarrationScript(generatedText);
          // Save newly generated script to cache
          if (generatedText && !cachedText) {
            setField("narrationScripts", { ...narrationScripts, [cacheKey]: generatedText });
          }
          setIsNarrating(false);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setIsNarrating(false);
      }
    },
    [currentStop, narrationScripts, setField]
  );

  // Auto-play narration on mount
  useEffect(() => {
    playNarration(timeOfDay, season);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-narrate and clear script on stop navigation (skip initial mount)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setNarrationScript(null);
    playNarration(timeOfDay, season);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStop]);

  // Re-trigger narration when time or season changes
  const handleTimeChange = (time: string) => {
    setTimeOfDay(time);
    playNarration(time, season);
  };

  const handleSeasonChange = (sea: string) => {
    setSeason(sea);
    playNarration(timeOfDay, sea);
  };

  // Voice Q&A
  const fetchAssistantAnswer = useCallback(
    async (prompt: string) => {
      const res = await fetch("/api/trip-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `[At ${currentStop.name}, ${timeOfDay}, ${season}]: ${prompt}`,
            },
          ],
          trip: { id: "current", title: currentStop.name, days: [], travellerProfile: "" },
          travelerProfile: "",
        }),
      });

      let answer = "";
      const reader = res.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.token) answer += parsed.token;
            } catch {
              // ignore malformed chunks
            }
          }
        }
      }
      return answer;
    },
    [currentStop, timeOfDay, season]
  );

  const handleMic = useCallback(async () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-CA";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

      setIsListening(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = async (event: any) => {
      setIsListening(false);
      const transcript = event.results[0][0].transcript;

      // Stop current narration immediately
      narrationAbortRef.current?.abort();
      if (narrationAudioRef.current) {
        narrationAudioRef.current.pause();
        narrationAudioRef.current = null;
      }
      setIsNarrating(false);

      setPendingQuestion(transcript);

      try {
          const answer = await fetchAssistantAnswer(transcript);

          // Persist to store
          const updatedHistory = [...chatHistory, { q: transcript, a: answer }];
          setField("immersiveChatHistory", { ...immersiveChatHistory, [stopKey]: updatedHistory });
          setPendingQuestion(null);

          // Speak the answer
          const speakRes = await fetch("/api/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stopName: currentStop.name,
              stopType: currentStop.type,
              stopNotes: "",
              timeOfDay,
              season,
              preGeneratedText: answer,
            }),
          });

          const contentType = speakRes.headers.get("Content-Type") || "";
          if (contentType.includes("audio")) {
            const blob = await speakRes.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            narrationAudioRef.current = audio;
            setIsNarrating(true);
            audio.onended = () => {
              setIsNarrating(false);
              URL.revokeObjectURL(url);
            };
            await audio.play();
          }
        } catch {
          setPendingQuestion(null);
          setIsListening(false);
        }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }, [fetchAssistantAnswer, chatHistory, immersiveChatHistory, stopKey, setField, currentStop, timeOfDay, season]);

  const handleTextAsk = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = textQuestion.trim();
      if (!trimmed) return;

      // Stop current narration immediately
      narrationAbortRef.current?.abort();
      if (narrationAudioRef.current) {
        narrationAudioRef.current.pause();
        narrationAudioRef.current = null;
      }
      setIsNarrating(false);

      setIsChatLoading(true);
      setPendingQuestion(trimmed);
      setTextQuestion("");

      try {
        const answer = await fetchAssistantAnswer(trimmed);

        // Persist to store
        const updatedHistory = [...chatHistory, { q: trimmed, a: answer }];
        setField("immersiveChatHistory", { ...immersiveChatHistory, [stopKey]: updatedHistory });
        setPendingQuestion(null);

        // Speak the answer (skip OpenRouter, ElevenLabs only)
        const speakRes = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stopName: currentStop.name,
            stopType: currentStop.type,
            stopNotes: "",
            timeOfDay,
            season,
            preGeneratedText: answer,
          }),
        });

        const contentType = speakRes.headers.get("Content-Type") || "";
        if (contentType.includes("audio")) {
          const blob = await speakRes.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          narrationAudioRef.current = audio;
          setIsNarrating(true);
          audio.onended = () => {
            setIsNarrating(false);
            URL.revokeObjectURL(url);
          };
          await audio.play();
        }
      } catch {
        setPendingQuestion(null);
      } finally {
        setIsChatLoading(false);
      }
    },
    [textQuestion, fetchAssistantAnswer, currentStop, timeOfDay, season, chatHistory, immersiveChatHistory, stopKey, setField]
  );

  // Stop all audio immediately
  const killAllAudio = useCallback(() => {
    narrationAbortRef.current?.abort();
    narrationAbortRef.current = null;
    if (narrationAudioRef.current) {
      narrationAudioRef.current.pause();
      narrationAudioRef.current.src = "";
      narrationAudioRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setIsNarrating(false);
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (bearingAnimRef.current) cancelAnimationFrame(bearingAnimRef.current);
      killAllAudio();
    };
  }, [killAllAudio]);

  const filterStyle = combinedFilter();

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < stops.length - 1;

  const handlePrevStop = () => {
    if (!hasPrev) return;
    const nextIndex = currentIndex - 1;
    setCurrentIndex(nextIndex);
    setCurrentStop(stops[nextIndex]);
  };

  const handleNextStop = () => {
    if (!hasNext) return;
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setCurrentStop(stops[nextIndex]);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black"
      style={{ width: "100vw", height: "100vh" }}
    >
      {/* Panorama/Map layer */}
      <div
        className="absolute inset-0"
        style={{ filter: filterStyle === "none" ? undefined : filterStyle }}
      >
        {svAvailable ? (
          <div ref={streetViewRef} className="w-full h-full" />
        ) : (
          <div ref={mapboxRef} className="w-full h-full" />
        )}
      </div>
      {/* Left sidebar: description + navigation + chat */}
      <div className="absolute inset-y-6 left-6 z-10 w-[320px] pointer-events-none">
        <div className="h-full bg-zinc-950/85 backdrop-blur-xl rounded-3xl border border-zinc-800 flex flex-col p-5 space-y-4 pointer-events-auto">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-400 font-semibold">
                  {currentStop.type === "hotel"
                    ? "Overnight Stay"
                    : currentStop.type === "airport"
                    ? "Flight Hub"
                    : "Trip Stop"}
                </p>
                <h2 className="text-lg font-semibold text-white leading-snug line-clamp-2">
                  {currentStop.name}
                </h2>
              </div>
              {isNarrating && (
                <span className="flex flex-col items-end gap-1 text-red-500 text-[10px] font-semibold">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Live
                  </span>
                  <span className="text-zinc-400 text-[9px]">Narration</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500">
              Stop {currentIndex + 1} of {stops.length}
            </p>
          </div>

          <div className="flex-1 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-3 overflow-hidden">
            <div className="h-full overflow-y-auto pr-1 space-y-3">
              {isNarrating && !narrationScript && chatHistory.length === 0 ? (
                <p className="text-[12px] text-zinc-400 leading-relaxed animate-pulse">
                  Generating narration…
                </p>
              ) : (
                <p className="text-[12px] text-zinc-200 leading-relaxed">
                  {narrationScript || currentStop.description || currentStop.notes || "A memorable stop on your BeaverTrails adventure."}
                </p>
              )}

              {(chatHistory.length > 0 || pendingQuestion) && (
                <div className="border-t border-zinc-700/50 pt-2 space-y-3">
                  {chatHistory.map((item, i) => (
                    <div key={i} className="space-y-1">
                      <p className="text-[11px] text-emerald-400/80 italic">&ldquo;{item.q}&rdquo;</p>
                      <p className="text-[12px] text-zinc-200 leading-relaxed">{item.a}</p>
                    </div>
                  ))}
                  {pendingQuestion && (
                    <div className="space-y-1">
                      <p className="text-[11px] text-emerald-400/80 italic">&ldquo;{pendingQuestion}&rdquo;</p>
                      <p className="text-[12px] text-zinc-400 animate-pulse">Thinking…</p>
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-zinc-500">
                Ask Beav about history, hidden gems, or what to look for in this view.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handlePrevStop}
                disabled={!hasPrev}
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-900/70 text-[11px] text-zinc-200 hover:border-emerald-500 hover:text-emerald-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
                Prev stop
              </button>
              <button
                onClick={handleNextStop}
                disabled={!hasNext}
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-900/70 text-[11px] text-zinc-200 hover:border-emerald-500 hover:text-emerald-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next stop
                <ChevronRight size={14} />
              </button>
            </div>

            <form onSubmit={handleTextAsk} className="flex items-center gap-2">
              <input
                type="text"
                value={textQuestion}
                onChange={(e) => setTextQuestion(e.target.value)}
                placeholder="Ask Beav about this view..."
                className="flex-1 rounded-full bg-zinc-900/80 border border-zinc-700 px-3 py-1.5 text-[12px] text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!textQuestion.trim() || isChatLoading}
                className="px-3 py-1.5 rounded-full bg-emerald-500 text-[11px] font-semibold text-black hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isChatLoading ? "Asking…" : "Ask"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Top-right: Exit + Mute */}
      <div className="absolute top-6 right-6 z-10 flex items-center gap-2">
        <button
          onClick={() => setMuteAmbient((m) => !m)}
          className="w-10 h-10 rounded-full bg-zinc-950/80 backdrop-blur-md flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
        >
          {muteAmbient ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <button
          onClick={() => { killAllAudio(); onClose(); }}
          className="w-10 h-10 rounded-full bg-zinc-950/80 backdrop-blur-md flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Bottom center: Time + Season toggles */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        {/* Time of day */}
        <div className="flex gap-1 bg-zinc-950/80 backdrop-blur-md rounded-full px-3 py-2 border border-zinc-700">
          {["Dawn", "Day", "Dusk", "Night"].map((t) => (
            <button
              key={t}
              onClick={() => handleTimeChange(t)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                timeOfDay === t
                  ? "bg-red-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {/* Season */}
        <div className="flex gap-1 bg-zinc-950/80 backdrop-blur-md rounded-full px-3 py-2 border border-zinc-700">
          {["Spring", "Summer", "Fall", "Winter"].map((s) => (
            <button
              key={s}
              onClick={() => handleSeasonChange(s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                season === s
                  ? "bg-red-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom-right: Mic button */}
      <div className="absolute bottom-8 right-6 z-10">
        <button
          onClick={handleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
            isListening
              ? "bg-red-600 animate-pulse text-white"
              : "bg-zinc-950/80 backdrop-blur-md text-zinc-300 hover:text-white border border-zinc-700"
          }`}
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
      </div>

    </motion.div>
  );
}
