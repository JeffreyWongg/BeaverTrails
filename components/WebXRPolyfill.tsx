"use client";

import { useEffect } from "react";

/**
 * Initialises the WebXR polyfill on browsers that don't natively support
 * the WebXR Device API (e.g. Safari / iOS).
 *
 * The polyfill patches `navigator.xr` so that `isSessionSupported("immersive-vr")`
 * returns true and `requestSession` works via DeviceOrientation + stereo rendering.
 *
 * Must be rendered early (root layout) so it runs before any component checks
 * for WebXR capabilities.
 */
export default function WebXRPolyfillLoader() {
  useEffect(() => {
    // Only polyfill if the browser doesn't already have native WebXR
    if (typeof navigator !== "undefined" && !navigator.xr) {
      import("webxr-polyfill").then(({ default: WebXRPolyfill }) => {
        new WebXRPolyfill();
        console.log("[WebXR] Polyfill installed — navigator.xr is now available");
      }).catch((err) => {
        console.warn("[WebXR] Failed to load polyfill:", err);
      });
    } else {
      console.log("[WebXR] Native WebXR detected — polyfill not needed");
    }
  }, []);

  return null; // This component renders nothing
}
