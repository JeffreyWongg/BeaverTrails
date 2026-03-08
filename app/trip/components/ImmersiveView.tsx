"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Mic, MicOff, Volume2, VolumeX,
  ChevronLeft, ChevronRight, Sparkles, ArrowLeft, Loader2, Send,
  Glasses, Compass, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { useSurveyStore } from "../../../lib/store";
import { Stop } from "../../../types";
import { PanoViewer } from "./PanoViewer";
import type { PanoViewerHandle, XRCapabilities } from "./PanoViewer";
import { AmbientEngine } from "./AmbientEngine";

type ImagineState = "idle" | "input" | "generating" | "ready" | "error";

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
  const ambientRef = useRef<AmbientEngine | null>(null);
  const narrationAudioRef = useRef<HTMLAudioElement | null>(null);
  const mapboxMapRef = useRef<unknown>(null);
  const bearingAnimRef = useRef<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panoRef = useRef<PanoViewerHandle>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const timeOfDay = initialTime || "Day";
  const season = initialSeason || "Summer";
  const [isNarrating, setIsNarrating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [muteAmbient, setMuteAmbient] = useState(false);
  // Chat history is used instead of single Q&A overlay
  const [textQuestion, setTextQuestion] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "beav"; text: string }>>([]);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [currentStop, setCurrentStop] = useState<Stop>(initialStop);

  // --- WebXR / Gyroscope State ---
  const [vrSupported, setVrSupported] = useState(false);
  const [gyroAvailable, setGyroAvailable] = useState(false);
  const [inVR, setInVR] = useState(false);
  const [gyroActive, setGyroActive] = useState(false);
  const [vrError, setVrError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleXRStatus = useCallback((caps: XRCapabilities) => {
    setVrSupported(caps.vrSupported);
    setGyroAvailable(caps.gyroAvailable);
  }, []);

  // --- Imagination Mode State ---
  const [imagineState, setImagineState] = useState<ImagineState>("idle");
  const [imaginePrompt, setImaginePrompt] = useState("");
  const [panoUrl, setPanoUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [worldCaption, setWorldCaption] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState("Starting generation...");
  const [genError, setGenError] = useState("");
  const [genElapsed, setGenElapsed] = useState(0);
  const genTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // (PanoViewer handles its own drag interaction)

  const { streetViewCoverage } = useSurveyStore();

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setCurrentStop(initialStop);
    // Reset imagination when stop changes
    setImagineState("idle");
    setPanoUrl(null);
    setThumbnailUrl(null);
    setImaginePrompt("");
    setChatHistory([]);
  }, [initialIndex, initialStop]);

  const stopKey =
    currentStop.id ||
    `${currentStop.name}_${currentStop.coordinates[0].toFixed(4)}_${currentStop.coordinates[1].toFixed(4)}`;
  const svAvailable = streetViewCoverage[stopKey] === true;

  // ── Ambient Audio (procedural via Web Audio API) ──
  useEffect(() => {
    const engine = new AmbientEngine();
    ambientRef.current = engine;
    // Build a text hint from the stop for the engine to pick a mood
    const hint = `${currentStop.name} ${currentStop.type} ${currentStop.description || ""} ${currentStop.notes || ""}`;
    engine.play(hint, 0.36);
    return () => {
      engine.kill(); // Instant stop on unmount — no lingering fade
      ambientRef.current = null;
    };
  }, [currentStop]);

  useEffect(() => {
    ambientRef.current?.setMuted(muteAmbient);
  }, [muteAmbient]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, isChatLoading]);

  // ── Street View ──
  const [svFailed, setSvFailed] = useState(false);

  useEffect(() => {
    if (!svAvailable || !streetViewRef.current) return;
    setSvFailed(false);

    const initPanorama = () => {
      if (!streetViewRef.current) return;
      try {
        const panorama = new google.maps.StreetViewPanorama(streetViewRef.current, {
          position: { lat: currentStop.coordinates[1], lng: currentStop.coordinates[0] },
          pov: { heading: 0, pitch: 0 },
          zoom: 1,
          disableDefaultUI: true,
          clickToGo: true,
          motionTracking: false,
        });

        // Listen for status — if no panorama found, mark as failed
        google.maps.event.addListenerOnce(panorama, "status_changed", () => {
          if (panorama.getStatus() !== google.maps.StreetViewStatus.OK) {
            console.warn("[ImmersiveView] Street View status not OK, falling back to Mapbox");
            setSvFailed(true);
          }
        });

        // Also listen for the visible_changed event as a safety check
        google.maps.event.addListenerOnce(panorama, "pano_changed", () => {
          console.log("[ImmersiveView] Street View panorama loaded successfully");
        });
      } catch (err) {
        console.error("[ImmersiveView] Street View init error:", err);
        setSvFailed(true);
      }
    };

    const loadAndInit = async () => {
      try {
        const { setOptions, importLibrary } = await import("@googlemaps/js-api-loader");
        setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "" });
        // Import both maps AND streetView libraries
        await Promise.all([
          importLibrary("maps"),
          importLibrary("streetView"),
        ]);
        // Small delay to ensure container is fully laid out
        requestAnimationFrame(() => {
          initPanorama();
        });
      } catch (err) {
        console.error("[ImmersiveView] Failed to load Google Maps:", err);
        setSvFailed(true);
      }
    };

    if (window.google?.maps?.StreetViewPanorama) {
      requestAnimationFrame(() => initPanorama());
    } else {
      loadAndInit();
    }

    return () => {};
  }, [svAvailable, currentStop]);

  // ── Mapbox Fallback (also used when Street View fails) ──
  const showMapbox = !svAvailable || svFailed;

  useEffect(() => {
    if (!showMapbox || !mapboxRef.current) return;

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
  }, [showMapbox, currentStop]);

  // ── Narration ──
  const playNarration = useCallback(
    async (time: string, sea: string) => {
      setIsNarrating(true);
      try {
        const res = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stopName: currentStop.name,
            stopType: currentStop.type,
            stopNotes: currentStop.notes || currentStop.description || "",
            timeOfDay: time,
            season: sea,
          }),
        });

        if (narrationAudioRef.current) narrationAudioRef.current.pause();

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
          setIsNarrating(false);
        }
      } catch {
        setIsNarrating(false);
      }
    },
    [currentStop]
  );

  useEffect(() => {
    playNarration(timeOfDay, season);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cut narration immediately ──
  const cutNarration = useCallback(() => {
    if (narrationAudioRef.current) {
      narrationAudioRef.current.pause();
      narrationAudioRef.current.src = "";
      narrationAudioRef.current = null;
    }
    setIsNarrating(false);
  }, []);

  // ── Speak text aloud via ElevenLabs ──
  const speakText = useCallback(
    async (text: string) => {
      cutNarration(); // Always cut existing narration first
      try {
        const speakRes = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stopName: currentStop.name,
            stopType: currentStop.type,
            stopNotes: text,
            timeOfDay,
            season,
            preGeneratedText: text, // Skip AI generation, just TTS this text
          }),
        });
        const ct = speakRes.headers.get("Content-Type") || "";
        if (ct.includes("audio")) {
          const blob = await speakRes.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          narrationAudioRef.current = audio;
          audio.onended = () => {
            setIsNarrating(false);
            URL.revokeObjectURL(url);
          };
          setIsNarrating(true);
          await audio.play();
        }
      } catch {
        setIsNarrating(false);
      }
    },
    [currentStop, timeOfDay, season, cutNarration]
  );

  // ── Chat Q&A ──
  const fetchAssistantAnswer = useCallback(
    async (prompt: string) => {
      const res = await fetch("/api/trip-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: `[At ${currentStop.name}, ${timeOfDay}, ${season}]: ${prompt}` },
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
              /* ignore */
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

      // Cut existing narration
      cutNarration();

      // Add to chat history
      setChatHistory((prev) => [...prev, { role: "user", text: transcript }]);
      setIsChatLoading(true);

      try {
        const answer = await fetchAssistantAnswer(transcript);
        setChatHistory((prev) => [...prev, { role: "beav", text: answer }]);
        speakText(answer);
      } catch {
        setChatHistory((prev) => [
          ...prev,
          { role: "beav", text: "Sorry, I had trouble answering that." },
        ]);
      } finally {
        setIsChatLoading(false);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }, [fetchAssistantAnswer, cutNarration, speakText]);

  const handleTextAsk = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = textQuestion.trim();
      if (!trimmed) return;

      // Immediately cut any playing narration
      cutNarration();

      // Add user message to chat history
      setChatHistory((prev) => [...prev, { role: "user", text: trimmed }]);
      setTextQuestion("");
      setIsChatLoading(true);

      try {
        const answer = await fetchAssistantAnswer(trimmed);

        // Add Beav's response to chat history
        setChatHistory((prev) => [...prev, { role: "beav", text: answer }]);

        // Voice the response aloud
        speakText(answer);
      } catch {
        setChatHistory((prev) => [
          ...prev,
          { role: "beav", text: "Sorry, I had trouble answering that. Try again?" },
        ]);
      } finally {
        setIsChatLoading(false);
      }
    },
    [textQuestion, fetchAssistantAnswer, cutNarration, speakText]
  );

  // ── Kill Audio (immediate — used on close/unmount) ──
  const killAllAudio = useCallback(() => {
    if (narrationAudioRef.current) {
      narrationAudioRef.current.pause();
      narrationAudioRef.current.src = "";
      narrationAudioRef.current = null;
    }
    ambientRef.current?.kill(); // Immediate stop, no fade
    ambientRef.current = null;
    setIsNarrating(false);
    setIsListening(false);
  }, []);

  useEffect(() => {
    const bearingAnim = bearingAnimRef;
    const poll = pollRef;
    const genTimer = genTimerRef;
    return () => {
      if (bearingAnim.current) cancelAnimationFrame(bearingAnim.current);
      if (poll.current) clearInterval(poll.current);
      if (genTimer.current) clearInterval(genTimer.current);
      killAllAudio();
    };
  }, [killAllAudio]);

  // ── Helper: narrate the imagined scene ──
  const narrateImaginedScene = useCallback(
    async (prompt: string, caption: string | null) => {
      setIsNarrating(true);
      try {
        const description = caption || prompt;
        const res = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stopName: `${currentStop.name} — Imagined`,
            stopType: "imagined",
            stopNotes: `User asked to see: "${prompt}". Scene description: ${description}. Give a quick, casual 1-2 sentence reaction to what this place looks like now.`,
            timeOfDay,
            season,
          }),
        });

        if (narrationAudioRef.current) narrationAudioRef.current.pause();

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
          setIsNarrating(false);
        }
      } catch {
        setIsNarrating(false);
      }
    },
    [currentStop, timeOfDay, season]
  );

  // ── Imagination: Start Generation ──
  const handleImagineSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const prompt = imaginePrompt.trim();
      if (!prompt) return;

      // ── Stop all current audio immediately ──
      if (narrationAudioRef.current) {
        narrationAudioRef.current.pause();
        narrationAudioRef.current.src = "";
        narrationAudioRef.current = null;
      }
      setIsNarrating(false);
      ambientRef.current?.stop(); // Silence ambient music during generation

      setImagineState("generating");
      setGenProgress("Sending to World Labs...");
      setGenError("");
      setGenElapsed(0);

      // Start elapsed timer
      genTimerRef.current = setInterval(() => {
        setGenElapsed((prev) => prev + 1);
      }, 1000);

      try {
        const res = await fetch("/api/imagine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stopName: currentStop.name,
            coordinates: currentStop.coordinates,
            userPrompt: prompt,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to start generation");
        }

        const { operationId, worldId: initialWorldId } = await res.json();
        setGenProgress("World generation in progress...");

        // Track the worldId as it becomes available
        let knownWorldId = initialWorldId || "";

        // Poll for completion every 4 seconds
        pollRef.current = setInterval(async () => {
          try {
            // Build poll URL — include worldId if we have it (for direct pano polling)
            let pollUrl = `/api/imagine?op=${operationId}`;
            if (knownWorldId) pollUrl += `&worldId=${knownWorldId}`;

            const pollRes = await fetch(pollUrl);
            const pollData = await pollRes.json();

            // Track worldId from response
            if (pollData.worldId) knownWorldId = pollData.worldId;

            // Update thumbnail/caption as they become available
            if (pollData.thumbnailUrl) setThumbnailUrl(pollData.thumbnailUrl);
            if (pollData.caption) setWorldCaption(pollData.caption);

            if (pollData.error && pollData.done) {
              clearInterval(pollRef.current!);
              pollRef.current = null;
              if (genTimerRef.current) { clearInterval(genTimerRef.current); genTimerRef.current = null; }
              setGenError(typeof pollData.error === "string" ? pollData.error : "Generation failed.");
              setImagineState("error");
              return;
            }

            if (pollData.done && pollData.panoUrl) {
              // Panorama is ready!
              clearInterval(pollRef.current!);
              pollRef.current = null;
              if (genTimerRef.current) { clearInterval(genTimerRef.current); genTimerRef.current = null; }
              console.log("[imagine] ✓ Pano ready:", pollData.panoUrl);
              setPanoUrl(pollData.panoUrl);
              setThumbnailUrl(pollData.thumbnailUrl || null);
              setWorldCaption(pollData.caption || null);
              setImagineState("ready");

              // ── Start new ambient for the imagined scene ──
              const sceneHint = `${prompt} ${pollData.caption || ""} ${currentStop.name}`;
              const newEngine = new AmbientEngine();
              ambientRef.current = newEngine;
              newEngine.play(sceneHint, 0.36);

              // ── AI narrates the new environment ──
              narrateImaginedScene(prompt, pollData.caption || null);
              return;
            }

            // Still generating or waiting for pano
            setGenProgress(pollData.description || "Generating...");
          } catch {
            // Network error on poll — keep trying
          }
        }, 4000);
      } catch (err: unknown) {
        if (genTimerRef.current) { clearInterval(genTimerRef.current); genTimerRef.current = null; }
        const msg = err instanceof Error ? err.message : String(err);
        setGenError(msg);
        setImagineState("error");
      }
    },
    [imaginePrompt, currentStop, narrateImaginedScene]
  );

  const handleBackToStreetView = async () => {
    // End any active VR session first
    if (inVR) {
      await panoRef.current?.exitVR();
      setInVR(false);
    }
    setGyroActive(false);

    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (genTimerRef.current) { clearInterval(genTimerRef.current); genTimerRef.current = null; }
    // Stop imagined-scene ambient
    ambientRef.current?.stop();
    // Restart location ambient
    const hint = `${currentStop.name} ${currentStop.type} ${currentStop.description || ""} ${currentStop.notes || ""}`;
    const engine = new AmbientEngine();
    ambientRef.current = engine;
    engine.play(hint, 0.36);

    setImagineState("idle");
    setPanoUrl(null);
    setThumbnailUrl(null);
    setWorldCaption(null);
    setImaginePrompt("");
    setGenError("");
  };

  // ── Navigation ──
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

  const isInImagination = imagineState === "ready";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black"
      style={{ width: "100vw", height: "100vh" }}
    >
      {/* ── Background Layer — Street View + Mapbox fallback ── */}
      <div className="absolute inset-0">
        {/* Street View layer — hidden when not available or failed */}
        <div
          ref={streetViewRef}
          className="w-full h-full absolute inset-0"
          style={{ display: svAvailable && !svFailed ? "block" : "none" }}
        />
        {/* Mapbox fallback — shown when no SV or SV failed */}
        <div
          ref={mapboxRef}
          className="w-full h-full absolute inset-0"
          style={{ display: showMapbox ? "block" : "none" }}
        />
      </div>

      {/* ── AI Panorama Overlay — renders ON TOP of Street View when ready ── */}
      <AnimatePresence>
        {isInImagination && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[5]"
          >
            {panoUrl ? (
              /* 360° panorama sphere — drag to look around like Street View */
              <PanoViewer
                ref={panoRef}
                imageUrl={panoUrl}
                onXRStatus={handleXRStatus}
                onVRChange={setInVR}
              />
            ) : thumbnailUrl ? (
              /* Thumbnail fallback */
              <div className="w-full h-full relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnailUrl}
                  alt="AI Generated World"
                  className="w-full h-full object-cover"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />
              </div>
            ) : (
              /* No visual — caption card */
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-purple-950/60 via-black to-black p-8">
                <Sparkles size={48} className="text-purple-400 mb-4" />
                <h2 className="text-xl font-bold text-white mb-3">Your Imagined World</h2>
                <p className="text-zinc-300 text-sm max-w-lg text-center leading-relaxed">
                  {worldCaption || `"${imaginePrompt}"`}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Generating Overlay ── */}
      <AnimatePresence>
        {imagineState === "generating" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <div className="flex flex-col items-center gap-6 max-w-md px-6 text-center">
              <div className="relative">
                <Loader2 size={48} className="text-purple-400 animate-spin" />
                <Sparkles size={20} className="text-purple-300 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Creating Your World</h3>
                <p className="text-zinc-400 text-sm">{genProgress}</p>
                <p className="text-zinc-600 text-xs">
                  {genElapsed}s elapsed — typically takes 3–5 minutes
                </p>
              </div>
              <div className="w-64 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: "90%" }}
                  transition={{ duration: 50, ease: "easeOut" }}
                />
              </div>
              <p className="text-zinc-500 text-xs italic max-w-sm">
                &ldquo;{imaginePrompt}&rdquo;
              </p>
              <button
                onClick={handleBackToStreetView}
                className="text-zinc-500 text-xs hover:text-white transition-colors underline"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error Overlay ── */}
      <AnimatePresence>
        {imagineState === "error" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <div className="flex flex-col items-center gap-4 max-w-md px-6 text-center">
              <h3 className="text-xl font-bold text-red-400">Generation Failed</h3>
              <p className="text-zinc-400 text-sm">{genError}</p>
              <div className="flex gap-3">
                <button
                  onClick={handleBackToStreetView}
                  className="px-4 py-2 rounded-full bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
                >
                  Back to Street View
                </button>
                <button
                  onClick={() => setImagineState("input")}
                  className="px-4 py-2 rounded-full text-white text-sm transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #D97B4A, #C89A7A)" }}
                >
                  Try Again
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sidebar Toggle Button (visible when collapsed) ── */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onClick={() => setSidebarOpen(true)}
            className="absolute top-6 left-6 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/80 transition-colors pointer-events-auto"
            title="Open sidebar"
          >
            <PanelLeftOpen size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Left Sidebar (collapsible) ── */}
      <motion.div
        initial={false}
        animate={{ x: sidebarOpen ? 0 : -340, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute inset-y-6 left-6 z-10 w-[320px] pointer-events-none"
      >
        <div className="h-full bg-black/70 backdrop-blur-xl rounded-3xl border border-white/10 flex flex-col p-5 space-y-4 pointer-events-auto">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-[0.16em] font-semibold"
                  style={{ color: isInImagination ? "#D97B4A" : "#D97B4A" }}
                >
                  {isInImagination
                    ? "✨ Imagined World"
                    : currentStop.type === "hotel"
                    ? "Overnight Stay"
                    : currentStop.type === "airport"
                    ? "Flight Hub"
                    : "Trip Stop"}
                </p>
                <h2 className="text-lg font-semibold text-white leading-snug line-clamp-2">
                  {currentStop.name}
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                {isNarrating && (
                  <span className="flex flex-col items-end gap-1 text-red-400 text-[10px] font-semibold">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      Live
                    </span>
                    <span className="text-white/40 text-[9px]">Narration</span>
                  </span>
                )}
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/40 hover:text-white transition-colors flex-shrink-0"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose size={14} />
                </button>
              </div>
            </div>
            <p className="text-[11px] text-white/40">
              Stop {currentIndex + 1} of {stops.length}
            </p>
          </div>

          {/* Description + Chat */}
          <div className="flex-1 rounded-2xl bg-white/5 border border-white/10 p-3 overflow-hidden">
            <div ref={chatScrollRef} className="h-full overflow-y-auto pr-1 space-y-2">
              {/* Always show location description first */}
              {isInImagination && worldCaption ? (
                <div className="pb-2 border-b border-white/10 mb-2">
                  <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: "#D97B4A" }}>
                    AI-Generated Scene
                  </p>
                  <p className="text-[12px] text-white/80 leading-relaxed italic">
                    &ldquo;{imaginePrompt}&rdquo;
                  </p>
                  <p className="text-[11px] text-white/50 leading-relaxed mt-1">
                    {worldCaption}
                  </p>
                </div>
              ) : (
                <div className={chatHistory.length > 0 ? "pb-2 border-b border-white/10 mb-2" : ""}>
                  <p className="text-[12px] text-white/80 leading-relaxed">
                    {currentStop.description || currentStop.notes || "A memorable stop on your BeaverTrails adventure."}
                  </p>
                  {chatHistory.length === 0 && (
                    <p className="text-[11px] text-white/40 mt-1">
                      Ask Beav anything about this place.
                    </p>
                  )}
                </div>
              )}

              {/* Chat messages */}
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-2.5 py-1.5 text-[11px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#D97B4A]/20 text-white/90 border border-[#D97B4A]/30"
                        : "bg-white/10 text-white/80 border border-white/10"
                    }`}
                  >
                    {msg.role === "beav" && (
                      <span className="text-[9px] font-bold block mb-0.5" style={{ color: "#D97B4A" }}>Beav</span>
                    )}
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] text-white/50">
                    <span className="text-[9px] font-bold block mb-0.5" style={{ color: "#D97B4A" }}>Beav</span>
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation + Chat */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              {isInImagination ? (
                <button
                  onClick={handleBackToStreetView}
                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full border border-purple-700 bg-purple-950/50 text-[11px] text-purple-300 hover:border-purple-400 hover:text-purple-200 transition-colors w-full"
                >
                  <ArrowLeft size={14} />
                  Back to Street View
                </button>
              ) : (
                <>
                  <button
                    onClick={handlePrevStop}
                    disabled={!hasPrev}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 text-[11px] text-white/70 hover:border-[#D97B4A]/60 hover:text-[#D97B4A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                    Prev
                  </button>
                  <button
                    onClick={handleNextStop}
                    disabled={!hasNext}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 text-[11px] text-white/70 hover:border-[#D97B4A]/60 hover:text-[#D97B4A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                </>
              )}
            </div>

            <form onSubmit={handleTextAsk} className="flex items-center gap-2">
              <input
                type="text"
                value={textQuestion}
                onChange={(e) => setTextQuestion(e.target.value)}
                placeholder="Ask Beav about this view…"
                className="flex-1 rounded-full bg-white/10 border border-white/20 px-3 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D97B4A]/50 focus:border-[#D97B4A]/50"
              />
              <button
                type="submit"
                disabled={!textQuestion.trim() || isChatLoading}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                style={{ background: "linear-gradient(135deg, #D97B4A, #C89A7A)" }}
              >
                {isChatLoading ? "…" : "Ask"}
              </button>
            </form>
          </div>
        </div>
      </motion.div>

      {/* ── Top-right: XR controls + Mute + Exit ── */}
      <div className="absolute top-6 right-6 z-10 flex items-center gap-2">
        {/* VR button — visible in imagination mode (always show, let WebXR handle errors) */}
        {isInImagination && (
          <button
            onClick={async () => {
              setVrError(null); // Clear previous errors
              
              if (inVR) {
                await panoRef.current?.exitVR();
              } else {
                // Debug: Check WebXR availability
                const hasXR = typeof navigator !== "undefined" && !!navigator.xr;
                const isSecure = window.location.protocol === "https:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
                
                if (!hasXR) {
                  setVrError("WebXR not detected. Quest Browser may require HTTPS. Try using ngrok or deploy to Vercel.");
                  return;
                }
                
                if (!isSecure && !window.location.hostname.includes("localhost") && !window.location.hostname.includes("127.0.0.1")) {
                  setVrError("WebXR requires HTTPS. Use ngrok (npx ngrok http 3000) or deploy to Vercel.");
                  return;
                }
                
                const success = await panoRef.current?.enterVR();
                if (!success) {
                  setVrError("Failed to enter VR. Check browser console for details. Make sure you're using Quest Browser.");
                }
              }
            }}
            className={`h-10 px-3 rounded-full backdrop-blur-md flex items-center justify-center gap-1.5 text-xs font-medium transition-all ${
              inVR
                ? "bg-purple-600/90 text-white border border-purple-400/50 shadow-lg shadow-purple-600/30"
                : vrSupported
                ? "bg-zinc-950/80 text-zinc-300 hover:text-white hover:bg-zinc-800/80"
                : "bg-zinc-950/60 text-zinc-400 hover:text-zinc-300 border border-zinc-700/50"
            }`}
            title={inVR ? "Exit VR" : vrSupported ? "Enter VR" : "Enter VR (may not be available)"}
          >
            <Glasses size={16} />
            {inVR ? "Exit VR" : "Enter VR"}
          </button>
        )}

        {/* Gyroscope toggle — visible in imagination mode on mobile (not in VR) */}
        {isInImagination && gyroAvailable && !inVR && (
          <button
            onClick={() => {
              const next = !gyroActive;
              panoRef.current?.setGyroEnabled(next);
              setGyroActive(next);
            }}
            className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
              gyroActive
                ? "bg-emerald-600/90 text-white shadow-lg shadow-emerald-600/30"
                : "bg-zinc-950/80 text-zinc-300 hover:text-white"
            }`}
            title={gyroActive ? "Disable gyroscope" : "Enable gyroscope look"}
          >
            <Compass size={18} />
          </button>
        )}

        <button
          onClick={() => setMuteAmbient((m) => !m)}
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          {muteAmbient ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <button
          onClick={() => {
            killAllAudio();
            onClose();
          }}
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* ── VR Error Message ── */}
      <AnimatePresence>
        {vrError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 right-6 z-20 max-w-sm"
          >
            <div className="bg-red-950/90 backdrop-blur-md border border-red-700/50 rounded-lg p-3 text-xs text-red-200 shadow-lg">
              <p className="font-semibold mb-1">VR Not Available</p>
              <p className="text-red-300/80">{vrError}</p>
              <button
                onClick={() => setVrError(null)}
                className="mt-2 text-red-400 hover:text-red-300 underline text-[10px]"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Center: Imagine This button / input ── */}
      {imagineState !== "generating" && imagineState !== "error" && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <AnimatePresence mode="wait">
            {imagineState === "idle" && !isInImagination && (
              <motion.button
                key="imagine-btn"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={() => setImagineState("input")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold shadow-lg hover:scale-105 transition-all border"
                style={{ 
                  background: "linear-gradient(135deg, #D97B4A, #C89A7A)",
                  boxShadow: "0 4px 20px rgba(217,123,74,0.35)",
                  borderColor: "rgba(217,123,74,0.3)"
                }}
              >
                <Sparkles size={16} />
                Imagine This
              </motion.button>
            )}

            {imagineState === "input" && (
              <motion.form
                key="imagine-input"
                initial={{ opacity: 0, y: 10, width: 200 }}
                animate={{ opacity: 1, y: 0, width: 480 }}
                exit={{ opacity: 0, y: 10 }}
                onSubmit={handleImagineSubmit}
                className="flex items-center gap-2 bg-black/80 backdrop-blur-xl rounded-full border px-3 py-2 shadow-lg"
                style={{ 
                  borderColor: "rgba(217,123,74,0.4)",
                  boxShadow: "0 4px 20px rgba(217,123,74,0.3)"
                }}
              >
                <Sparkles size={16} className="flex-shrink-0 ml-1" style={{ color: "#D97B4A" }} />
                <input
                  type="text"
                  value={imaginePrompt}
                  onChange={(e) => setImaginePrompt(e.target.value)}
                  placeholder='e.g. "this place at night in a snowstorm"'
                  autoFocus
                  className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!imaginePrompt.trim()}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #D97B4A, #C89A7A)" }}
                >
                  <Send size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImagineState("idle");
                    setImaginePrompt("");
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </motion.form>
            )}

            {isInImagination && (
              <motion.div
                key="imagine-badge"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border text-xs font-medium"
                style={{ 
                  background: "rgba(217,123,74,0.2)",
                  borderColor: "rgba(217,123,74,0.3)",
                  color: "#D97B4A"
                }}
              >
                <Sparkles size={14} style={{ color: "#D97B4A" }} />
                {inVR
                  ? "AI-Generated World — VR Mode Active"
                  : gyroActive
                  ? "AI-Generated World — Gyroscope Active"
                  : panoUrl
                  ? "AI-Generated World — Drag to look around"
                  : "AI-Generated World"}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Bottom-right: Mic button ── */}
      <div className="absolute bottom-8 right-6 z-10">
        <button
          onClick={handleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
            isListening
              ? "bg-red-500 animate-pulse text-white"
              : "bg-black/60 backdrop-blur-md text-white/60 hover:text-white border border-white/10"
          }`}
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
      </div>

      {/* Q&A Overlay removed — chat is now inline in the left sidebar */}
    </motion.div>
  );
}
