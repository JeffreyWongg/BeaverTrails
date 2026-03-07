"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Stop } from "../../../types";
import { X, MapPin } from "lucide-react";

interface ImmersiveDrawerProps {
  stop: Stop | null;
  onClose: () => void;
}

export function ImmersiveDrawer({ stop, onClose }: ImmersiveDrawerProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

  // Mapbox Static Image API — satellite view of the actual location
  const getLocationImage = (coords: [number, number]) =>
    `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${coords[0]},${coords[1]},13,0,0/800x400@2x?access_token=${mapboxToken}`;

  return (
    <AnimatePresence>
      {stop && (
        <motion.div
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "-100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="absolute top-0 left-0 h-full w-[380px] max-w-[80vw] bg-zinc-950/95 backdrop-blur-xl border-r border-zinc-800 z-30 shadow-2xl overflow-y-auto"
        >
          {/* Real satellite image of the location */}
          <div className="relative h-52 w-full bg-zinc-900 overflow-hidden">
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

             <div className="absolute bottom-4 left-6 z-20">
                <span className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold bg-canada-red/20 text-white border border-canada-red/30 rounded-md mb-2 inline-block">
                   {stop.type}
                </span>
                <h2 className="text-2xl font-black text-white px-1 leading-tight drop-shadow-lg">{stop.name}</h2>
             </div>
          </div>

          <div className="p-6 space-y-4">
             {/* Description */}
             {stop.description && (
                <p className="text-sm text-zinc-300 leading-relaxed">
                   {stop.description}
                </p>
             )}

             {/* Location coordinates */}
             <div className="flex bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 items-start gap-3">
                <MapPin className="text-canada-red-light mt-0.5 flex-shrink-0" size={18} />
                <div>
                  <p className="text-sm font-bold text-white mb-1">Location</p>
                  <p className="text-xs text-zinc-400 font-mono">Lat: {stop.coordinates[1].toFixed(4)}</p>
                  <p className="text-xs text-zinc-400 font-mono">Lng: {stop.coordinates[0].toFixed(4)}</p>
                </div>
             </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
