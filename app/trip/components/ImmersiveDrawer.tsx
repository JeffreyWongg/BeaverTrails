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
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
          className="absolute top-0 left-0 h-full w-[320px] max-w-[80vw] bg-[#FAF7F2]/97 backdrop-blur-xl border-r border-gray-200 z-30 shadow-xl overflow-y-auto"
        >
          {/* Satellite image header */}
          <div className="relative h-52 w-full bg-gray-100 overflow-hidden flex-shrink-0">
            <img
              src={getLocationImage(stop.coordinates)}
              alt={stop.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Soft gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#FAF7F2] via-[#FAF7F2]/20 to-transparent" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors shadow-sm"
            >
              <X size={15} />
            </button>

            {/* Stop label */}
            <div className="absolute bottom-4 left-5 z-20 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] font-medium bg-white/80 text-[#D97B4A] border border-[#C89A7A]/30 rounded-full backdrop-blur-sm inline-block">
                  {stop.type}
                </span>
                {hasStreetView && (
                  <span className="px-2.5 py-1 text-[10px] font-medium bg-white/80 text-blue-600 border border-blue-200 rounded-full backdrop-blur-sm flex items-center gap-1">
                    <Camera size={9} />
                    Street View
                  </span>
                )}
              </div>
              <h2 className="text-xl font-semibold text-gray-900 leading-tight drop-shadow-sm">
                {stop.name}
              </h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Description */}
            {stop.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{stop.description}</p>
            )}

            {/* Address */}
            {stop.address && (
              <div className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
                <MapPin className="text-[#D97B4A] mt-0.5 flex-shrink-0" size={15} />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-0.5">
                    Address
                  </p>
                  <p className="text-sm text-gray-700">{stop.address}</p>
                </div>
              </div>
            )}

            {/* Estimated cost */}
            {stop.estimatedCost && (
              <div className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-[#D97B4A] mt-0.5 flex-shrink-0 text-sm font-bold">$</span>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-0.5">
                    Estimated Cost
                  </p>
                  <p className="text-sm text-gray-700">{stop.estimatedCost}</p>
                </div>
              </div>
            )}

            {/* Notes */}
            {stop.notes && (
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1">
                  Notes
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">{stop.notes}</p>
              </div>
            )}

            {/* Coordinates */}
            <div className="flex bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm items-start gap-3">
              <MapPin className="text-[#D97B4A] mt-0.5 flex-shrink-0" size={15} />
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Location</p>
                <p className="text-xs text-gray-400 font-mono">
                  Lat: {stop.coordinates[1].toFixed(4)}
                </p>
                <p className="text-xs text-gray-400 font-mono">
                  Lng: {stop.coordinates[0].toFixed(4)}
                </p>
              </div>
            </div>

            {/* Street View availability */}
            <div
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium ${
                hasStreetView
                  ? "bg-blue-50 border-blue-200 text-blue-600"
                  : "bg-gray-50 border-gray-200 text-gray-400"
              }`}
            >
              <Camera size={13} />
              {hasStreetView
                ? "360° Street View available at this stop"
                : "No Street View coverage at this location"}
            </div>

            {/* Enter Immersive View */}
            <button
              onClick={() => onEnterImmersive?.(stop, "Day", "Summer")}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-full text-white text-sm font-medium transition-all shadow-[0_4px_16px_rgba(217,123,74,0.3)] hover:shadow-[0_6px_20px_rgba(217,123,74,0.4)] hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #D97B4A, #C89A7A)" }}
            >
              <Globe size={15} />
              Enter Immersive View
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
