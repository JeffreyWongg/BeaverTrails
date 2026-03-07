"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Stop } from "../../../types";
import { X, MapPin, Camera, Globe } from "lucide-react";
import { useSurveyStore } from "../../../lib/store";
import { getStopKey } from "../../../lib/streetView";

interface ImmersiveDrawerProps {
  stop: Stop | null;
  onClose: () => void;
  onEnterImmersive?: (stop: Stop, time: string, season: string) => void;
}

export function ImmersiveDrawer({ stop, onClose, onEnterImmersive }: ImmersiveDrawerProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
  const { streetViewCoverage } = useSurveyStore();

  const getLocationImage = (coords: [number, number]) =>
    `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${coords[0]},${coords[1]},13,0,0/800x400@2x?access_token=${mapboxToken}`;

  const stopKey = stop ? getStopKey(stop) : "";
  const hasStreetView = stop ? streetViewCoverage[stopKey] === true : false;

  return (
    <AnimatePresence>
      {stop && (
        <motion.div
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "-100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="absolute top-0 left-0 h-full w-[380px] max-w-[80vw] bg-zinc-950/95 backdrop-blur-xl border-r border-emerald-900/50 z-30 shadow-2xl overflow-y-auto"
        >
          {/* Satellite image header */}
          <div className="relative h-52 w-full bg-zinc-900 overflow-hidden flex-shrink-0">
            <img
              src={getLocationImage(stop.coordinates)}
              alt={stop.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-zinc-950/60 backdrop-blur flex items-center justify-center text-zinc-400 hover:text-white transition-colors hover:bg-zinc-800"
            >
              <X size={16} />
            </button>

            <div className="absolute bottom-4 left-6 z-20 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md inline-block">
                  {stop.type}
                </span>
                {hasStreetView && (
                  <span
                    title="Street View available"
                    className="px-2 py-1 text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md flex items-center gap-1"
                  >
                    <Camera size={10} />
                    Street View
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black text-white px-1 leading-tight drop-shadow-lg">
                {stop.name}
              </h2>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Description */}
            {stop.description && (
              <p className="text-sm text-zinc-300 leading-relaxed">{stop.description}</p>
            )}

            {/* Address */}
            {stop.address && (
              <div className="flex items-start gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                <MapPin className="text-emerald-400 mt-0.5 flex-shrink-0" size={16} />
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-0.5">Address</p>
                  <p className="text-sm text-zinc-300">{stop.address}</p>
                </div>
              </div>
            )}

            {/* Estimated cost */}
            {stop.estimatedCost && (
              <div className="flex items-start gap-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                <span className="text-emerald-400 mt-0.5 flex-shrink-0 text-sm font-bold">$</span>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-0.5">Estimated Cost</p>
                  <p className="text-sm text-zinc-300">{stop.estimatedCost}</p>
                </div>
              </div>
            )}

            {/* Notes */}
            {stop.notes && (
              <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">Notes</p>
                <p className="text-sm text-zinc-400">{stop.notes}</p>
              </div>
            )}

            {/* Location coordinates */}
            <div className="flex bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 items-start gap-3">
              <MapPin className="text-emerald-400 mt-0.5 flex-shrink-0" size={18} />
              <div>
                <p className="text-sm font-bold text-white mb-1">Location</p>
                <p className="text-xs text-zinc-400 font-mono">
                  Lat: {stop.coordinates[1].toFixed(4)}
                </p>
                <p className="text-xs text-zinc-400 font-mono">
                  Lng: {stop.coordinates[0].toFixed(4)}
                </p>
              </div>
            </div>

            {/* Street View availability info */}
            <div
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium ${
                hasStreetView
                  ? "bg-blue-950/30 border-blue-900/40 text-blue-300"
                  : "bg-zinc-900/40 border-zinc-800/40 text-zinc-500"
              }`}
            >
              <Camera size={14} />
              {hasStreetView
                ? "360° Street View available"
                : "No Street View coverage at this location"}
            </div>

            {/* Enter Immersive View button */}
            <button
              onClick={() => onEnterImmersive?.(stop, "Day", "Summer")}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold text-sm transition-all shadow-lg shadow-red-900/30 hover:shadow-red-800/40"
            >
              <Globe size={16} />
              Enter Immersive View 🌍
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
