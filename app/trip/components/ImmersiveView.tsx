"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, MicOff, Volume2, VolumeX, ChevronLeft, ChevronRight } from "lucide-react";
import { useSurveyStore } from "../../../lib/store";
import { Stop } from "../../../types";

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
  const mapboxMapRef = useRef<unknown>(null);
  const bearingAnimRef = useRef<number | null>(null);

  const [timeOfDay, setTimeOfDay] = useState(initialTime || "Day");
  const [season, setSeason] = useState(initialSeason || "Summer");
  const [isNarrating, setIsNarrating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [muteAmbient, setMuteAmbient] = useState(false);
  const [qaOverlay, setQaOverlay] = useState<{ q: string; a: string } | null>(null);
  const [qaFading, setQaFading] = useState(false);
  const [textQuestion, setTextQuestion] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [currentStop, setCurrentStop] = useState<Stop>(initialStop);

  const { streetViewCoverage } = useSurveyStore();

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setCurrentStop(initialStop);
  }, [initialIndex, initialStop]);

  const stopKey =
    currentStop.id ||
    `${currentStop.name}_${currentStop.coordinates[0].toFixed(4)}_${currentStop.coordinates[1].toFixed(4)}`;
  const svAvailable = streetViewCoverage[stopKey] === true;

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
      setIsNarrating(true);
      try {
        const res = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stopName: stop.name,
            stopType: currentStop.type,
            stopNotes: currentStop.notes || currentStop.description || "",
            timeOfDay: time,
            season: sea,
          }),
        });

        if (narrationAudioRef.current) {
          narrationAudioRef.current.pause();
        }

        const contentType = res.headers.get("Content-Type") || "";
        if (contentType.includes("audio")) {
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
          // Fallback: text only (ElevenLabs not configured)
          setIsNarrating(false);
        }
      } catch {
        setIsNarrating(false);
      }
    },
    [currentStop]
  );

  // Auto-play narration on mount
  useEffect(() => {
    playNarration(timeOfDay, season);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      try {
          const answer = await fetchAssistantAnswer(transcript);

          // Show overlay for 5s
          setQaOverlay({ q: transcript, a: answer });
          setQaFading(false);

          // Play response via ElevenLabs
          const speakRes = await fetch("/api/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stopName: currentStop.name,
              stopType: currentStop.type,
              stopNotes: answer,
              timeOfDay,
              season,
            }),
          });

          const contentType = speakRes.headers.get("Content-Type") || "";
          if (contentType.includes("audio")) {
            const blob = await speakRes.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.onended = () => URL.revokeObjectURL(url);
            await audio.play();
          }

          setTimeout(() => {
            setQaFading(true);
            setTimeout(() => setQaOverlay(null), 1000);
          }, 5000);
        } catch {
          setIsListening(false);
        }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }, [fetchAssistantAnswer]);

  const handleTextAsk = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = textQuestion.trim();
      if (!trimmed) return;
      setIsChatLoading(true);
      try {
        const answer = await fetchAssistantAnswer(trimmed);

        setQaOverlay({ q: trimmed, a: answer });
        setQaFading(false);

        const speakRes = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stopName: currentStop.name,
            stopType: currentStop.type,
            stopNotes: answer,
            timeOfDay,
            season,
          }),
        });

        const contentType = speakRes.headers.get("Content-Type") || "";
        if (contentType.includes("audio")) {
          const blob = await speakRes.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => URL.revokeObjectURL(url);
          await audio.play();
        }

        setTimeout(() => {
          setQaFading(true);
          setTimeout(() => setQaOverlay(null), 1000);
        }, 5000);

        setTextQuestion("");
      } finally {
        setIsChatLoading(false);
      }
    },
    [textQuestion, fetchAssistantAnswer, currentStop.name, currentStop.type, timeOfDay, season]
  );

  // Stop all audio immediately
  const killAllAudio = useCallback(() => {
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
            <div className="h-full overflow-y-auto pr-1 space-y-2">
              <p className="text-[12px] text-zinc-200 leading-relaxed">
                {currentStop.description || currentStop.notes || "A memorable stop on your BeaverTrails adventure."}
              </p>
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

      {/* Q&A overlay */}
      <AnimatePresence>
        {qaOverlay && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: qaFading ? 0 : 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 z-10 max-w-lg w-full px-4"
          >
            <div className="bg-zinc-950/90 backdrop-blur-md rounded-2xl p-4 border border-zinc-700 space-y-2">
              <p className="text-zinc-400 text-xs italic">&ldquo;{qaOverlay.q}&rdquo;</p>
              <p className="text-white text-sm leading-relaxed">{qaOverlay.a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
