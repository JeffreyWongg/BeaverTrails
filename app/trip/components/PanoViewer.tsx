"use client";

import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as THREE from "three";

/* ────────────────────────────────────────────────────────────
 * Public API exposed via ref (useImperativeHandle)
 * ──────────────────────────────────────────────────────────── */
export interface PanoViewerHandle {
  /** Request an immersive-vr WebXR session. Returns true if successful. */
  enterVR: () => Promise<boolean>;
  /** End the current XR session */
  exitVR: () => Promise<void>;
  /** Enable / disable device-orientation (gyroscope) look-around on mobile */
  setGyroEnabled: (enabled: boolean) => void;
}

export interface XRCapabilities {
  vrSupported: boolean;
  gyroAvailable: boolean;
}

interface PanoViewerProps {
  imageUrl: string;
  /** Fired once on mount with capability info */
  onXRStatus?: (caps: XRCapabilities) => void;
  /** Fired when an XR session starts or ends */
  onVRChange?: (active: boolean) => void;
}

/* ────────────────────────────────────────────────────────────
 * PanoViewer — Full-screen 360° panorama with WebXR support
 *
 * Renders an equirectangular image on the inside of a sphere.
 *
 *  Desktop  — drag to look around, scroll to zoom, arrow keys
 *  Mobile   — drag / pinch-to-zoom, optional gyroscope look
 *  VR       — head tracking via WebXR immersive-vr session
 * ──────────────────────────────────────────────────────────── */
export const PanoViewer = forwardRef<PanoViewerHandle, PanoViewerProps>(
  function PanoViewerInner({ imageUrl, onXRStatus, onVRChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);

    /* Mutable state shared between the render loop and imperative API.
       Stored in a single ref so closures always see latest values. */
    const state = useRef({
      renderer: null as THREE.WebGLRenderer | null,
      scene: null as THREE.Scene | null,
      camera: null as THREE.PerspectiveCamera | null,
      xrSession: null as XRSession | null,
      gyroEnabled: false,
      gyro: { alpha: 0, beta: 0, gamma: 0 },
    });

    /* ── Detect browser capabilities once ── */
    useEffect(() => {
      const detect = async () => {
        let vrSupported = false;
        // Gyroscope detection: phones/tablets almost always have gyros; laptops rarely do
        const isMobileDevice =
          typeof window !== "undefined" &&
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          );
        const gyroAvailable =
          typeof window !== "undefined" &&
          typeof DeviceOrientationEvent !== "undefined" &&
          isMobileDevice;

        // Check for WebXR support (native or polyfilled)
        // The polyfill may take a moment to install, so retry a few times
        const checkXR = async (retries = 3): Promise<boolean> => {
          for (let i = 0; i < retries; i++) {
            try {
              if (typeof navigator !== "undefined" && navigator.xr) {
                const supported = await navigator.xr.isSessionSupported("immersive-vr");
                console.log(`[PanoViewer] WebXR immersive-vr supported: ${supported} (attempt ${i + 1})`);
                return supported;
              }
            } catch (err) {
              console.warn(`[PanoViewer] WebXR detection attempt ${i + 1} error:`, err);
            }
            // Wait 200ms before retrying (polyfill may still be loading)
            if (i < retries - 1) await new Promise((r) => setTimeout(r, 200));
          }
          console.warn("[PanoViewer] navigator.xr not available after retries");
          return false;
        };

        vrSupported = await checkXR();
        onXRStatus?.({ vrSupported, gyroAvailable });
      };

      // Delay detection to ensure polyfill has had time to install
      const timeout = setTimeout(detect, 300);
      return () => clearTimeout(timeout);
      // Only run once — onXRStatus is expected to be stable (useCallback)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── Imperative handle (enterVR / exitVR / gyro) ── */
    useImperativeHandle(
      ref,
      () => ({
        enterVR: async () => {
          const r = state.current.renderer;
          if (!r) {
            console.error("[PanoViewer] Renderer not initialized");
            return false;
          }

          if (typeof navigator === "undefined" || !navigator.xr) {
            console.error("[PanoViewer] WebXR not available (native or polyfill).");
            return false;
          }

          try {
            // Check if immersive-vr is supported (native or via polyfill)
            const isSupported = await navigator.xr.isSessionSupported("immersive-vr");
            if (!isSupported) {
              console.error("[PanoViewer] immersive-vr not supported on this device");
              return false;
            }

            // Request VR session — the polyfill will provide a cardboard-style
            // stereo split-screen using DeviceOrientation on devices without
            // native WebXR (e.g. iPhone Safari).
            const session = await navigator.xr.requestSession("immersive-vr", {
              optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"],
            });

            await r.xr.setSession(session);
            state.current.xrSession = session;
            onVRChange?.(true);

            session.addEventListener("end", () => {
              state.current.xrSession = null;
              onVRChange?.(false);
            });

            console.log("[PanoViewer] VR session started successfully (polyfill or native)");
            return true;
          } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error("[PanoViewer] Could not start VR session:", errorMsg);
            
            // Provide helpful error messages
            if (errorMsg.includes("not allowed") || errorMsg.includes("permission")) {
              console.error("[PanoViewer] Permission denied. On iOS, tap the screen first then try again.");
            } else if (errorMsg.includes("not supported")) {
              console.error("[PanoViewer] WebXR not supported even with polyfill.");
            }
            
            return false;
          }
        },

        exitVR: async () => {
          const s = state.current.xrSession;
          if (s) {
            await s.end();
            state.current.xrSession = null;
          }
        },

        setGyroEnabled: (enabled: boolean) => {
          state.current.gyroEnabled = enabled;

          // iOS 13+ requires explicit permission for DeviceOrientationEvent
          if (enabled && typeof DeviceOrientationEvent !== "undefined") {
            const doe = DeviceOrientationEvent as unknown as {
              requestPermission?: () => Promise<string>;
            };
            if (typeof doe.requestPermission === "function") {
              doe
                .requestPermission()
                .then((response) => {
                  if (response !== "granted") {
                    state.current.gyroEnabled = false;
                  }
                })
                .catch(() => {
                  state.current.gyroEnabled = false;
                });
            }
          }
        },
      }),
      [onVRChange]
    );

    /* ── Main Three.js + WebXR setup ── */
    useEffect(() => {
      const container = containerRef.current;
      if (!container || !imageUrl) return;

      const st = state.current;

      // ── Scene ──
      const scene = new THREE.Scene();
      st.scene = scene;

      // ── Camera ──
      const camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1100
      );
      // Slightly off-centre so lookAt() works before first interaction
      camera.position.set(0, 0, 0.01);
      st.camera = camera;

      // ── Renderer (WebXR-enabled) ──
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      // ---- WebXR ----
      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType("local"); // seated / stationary

      container.appendChild(renderer.domElement);
      st.renderer = renderer;

      // ── Panorama sphere (inverted — we view from inside) ──
      const geometry = new THREE.SphereGeometry(500, 60, 40);
      geometry.scale(-1, 1, 1);

      const loader = new THREE.TextureLoader();
      loader.crossOrigin = "anonymous";
      const texture = loader.load(imageUrl, () => {
        renderer.render(scene, camera);
      });
      texture.colorSpace = THREE.SRGBColorSpace;

      const material = new THREE.MeshBasicMaterial({ map: texture });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // ── Manual camera state (non-VR) ──
      let lon = 0;
      let lat = 0;
      let fov = 75;
      let isDragging = false;
      let px = 0;
      let py = 0;
      let sLon = 0;
      let sLat = 0;

      // — Pointer (mouse / single-finger touch) —
      const onPointerDown = (e: PointerEvent) => {
        if (renderer.xr.isPresenting) return;
        isDragging = true;
        px = e.clientX;
        py = e.clientY;
        sLon = lon;
        sLat = lat;
        container.style.cursor = "grabbing";
      };

      const onPointerMove = (e: PointerEvent) => {
        if (!isDragging || renderer.xr.isPresenting) return;
        lon = sLon + (px - e.clientX) * 0.2;
        lat = Math.max(-85, Math.min(85, sLat + (e.clientY - py) * 0.2));
      };

      const onPointerUp = () => {
        isDragging = false;
        container.style.cursor = "grab";
      };

      // — Mouse wheel zoom —
      const onWheel = (e: WheelEvent) => {
        if (renderer.xr.isPresenting) return;
        e.preventDefault();
        fov = Math.max(30, Math.min(100, fov + e.deltaY * 0.05));
        camera.fov = fov;
        camera.updateProjectionMatrix();
      };

      // — Touch: pinch-to-zoom —
      let pinchDist = 0;
      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          pinchDist = Math.sqrt(dx * dx + dy * dy);
        }
      };
      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 2 && !renderer.xr.isPresenting) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const d = Math.sqrt(dx * dx + dy * dy);
          fov = Math.max(30, Math.min(100, fov + (pinchDist - d) * 0.1));
          camera.fov = fov;
          camera.updateProjectionMatrix();
          pinchDist = d;
        }
      };

      // — Keyboard (arrow keys + +/-) —
      const onKeyDown = (e: KeyboardEvent) => {
        if (renderer.xr.isPresenting) return;
        const step = 3;
        switch (e.key) {
          case "ArrowLeft":
            lon -= step;
            break;
          case "ArrowRight":
            lon += step;
            break;
          case "ArrowUp":
            lat = Math.min(85, lat + step);
            break;
          case "ArrowDown":
            lat = Math.max(-85, lat - step);
            break;
          case "+":
          case "=":
            fov = Math.max(30, fov - 3);
            camera.fov = fov;
            camera.updateProjectionMatrix();
            break;
          case "-":
            fov = Math.min(100, fov + 3);
            camera.fov = fov;
            camera.updateProjectionMatrix();
            break;
        }
      };

      // — Device orientation (gyroscope) —
      const onDeviceOrientation = (e: DeviceOrientationEvent) => {
        if (!st.gyroEnabled || renderer.xr.isPresenting) return;
        st.gyro = {
          alpha: e.alpha || 0,
          beta: e.beta || 0,
          gamma: e.gamma || 0,
        };
      };

      // ── Bind events ──
      container.addEventListener("pointerdown", onPointerDown);
      container.addEventListener("pointermove", onPointerMove);
      container.addEventListener("pointerup", onPointerUp);
      container.addEventListener("pointerleave", onPointerUp);
      container.addEventListener("wheel", onWheel, { passive: false });
      container.addEventListener("touchstart", onTouchStart, { passive: true });
      container.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("deviceorientation", onDeviceOrientation);

      // ── Resize ──
      const onResize = () => {
        if (renderer.xr.isPresenting) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      };
      window.addEventListener("resize", onResize);

      // ── Render loop (setAnimationLoop is REQUIRED for WebXR) ──
      const target = new THREE.Vector3();

      renderer.setAnimationLoop(() => {
        if (!renderer.xr.isPresenting) {
          // Manual camera look (pointer-drag OR gyroscope)
          if (st.gyroEnabled) {
            lon = st.gyro.alpha;
            lat = Math.max(-85, Math.min(85, st.gyro.beta - 90));
          }

          const phi = THREE.MathUtils.degToRad(90 - lat);
          const theta = THREE.MathUtils.degToRad(lon);
          target.set(
            500 * Math.sin(phi) * Math.cos(theta),
            500 * Math.cos(phi),
            500 * Math.sin(phi) * Math.sin(theta)
          );
          camera.lookAt(target);
        }
        // In VR: Three.js XR manager handles camera orientation
        // (stereoscopic rendering + head tracking are automatic)

        renderer.render(scene, camera);
      });

      // ── Cleanup ──
      return () => {
        renderer.setAnimationLoop(null);

        container.removeEventListener("pointerdown", onPointerDown);
        container.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("pointerup", onPointerUp);
        container.removeEventListener("pointerleave", onPointerUp);
        container.removeEventListener("wheel", onWheel);
        container.removeEventListener("touchstart", onTouchStart);
        container.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("deviceorientation", onDeviceOrientation);
        window.removeEventListener("resize", onResize);

        // End any active XR session
        if (st.xrSession) {
          st.xrSession.end().catch(() => {});
          st.xrSession = null;
        }

        geometry.dispose();
        material.dispose();
        texture.dispose();
        renderer.dispose();

        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }

        st.renderer = null;
        st.scene = null;
        st.camera = null;
      };
    }, [imageUrl]);

    return (
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ cursor: "grab" }}
      />
    );
  }
);
