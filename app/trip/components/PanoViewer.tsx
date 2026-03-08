"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface PanoViewerProps {
  imageUrl: string;
}

/**
 * Full-screen 360° equirectangular panorama viewer using Three.js.
 * Renders the image on an inverted sphere — drag to look around, scroll to zoom.
 * Feels like Google Street View.
 */
export function PanoViewer({ imageUrl }: PanoViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !imageUrl) return;

    // ── Scene setup ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75, // FOV
      container.clientWidth / container.clientHeight,
      1,
      1100
    );
    camera.target = new THREE.Vector3(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Sphere with equirectangular texture ──
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1); // Invert so we see the inside

    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = "anonymous";

    const texture = textureLoader.load(imageUrl, () => {
      // Texture loaded — trigger first render
      renderer.render(scene, camera);
    });
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // ── Camera rotation state ──
    let lon = 0;
    let lat = 0;
    let phi = 0;
    let theta = 0;
    let fov = 75;

    let isDragging = false;
    let pointerX = 0;
    let pointerY = 0;
    let dragStartLon = 0;
    let dragStartLat = 0;

    // ── Mouse / Touch handlers ──
    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      pointerX = e.clientX;
      pointerY = e.clientY;
      dragStartLon = lon;
      dragStartLat = lat;
      container.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      lon = dragStartLon + (pointerX - e.clientX) * 0.2;
      lat = dragStartLat + (e.clientY - pointerY) * 0.2;
      lat = Math.max(-85, Math.min(85, lat)); // Clamp vertical
    };

    const onPointerUp = () => {
      isDragging = false;
      container.style.cursor = "grab";
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      fov = Math.max(30, Math.min(100, fov + e.deltaY * 0.05));
      camera.fov = fov;
      camera.updateProjectionMatrix();
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointerleave", onPointerUp);
    container.addEventListener("wheel", onWheel, { passive: false });

    // ── Resize handler ──
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // ── Animation loop ──
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      phi = THREE.MathUtils.degToRad(90 - lat);
      theta = THREE.MathUtils.degToRad(lon);

      camera.target.x = 500 * Math.sin(phi) * Math.cos(theta);
      camera.target.y = 500 * Math.cos(phi);
      camera.target.z = 500 * Math.sin(phi) * Math.sin(theta);

      camera.lookAt(camera.target);
      renderer.render(scene, camera);
    };

    frameRef.current = requestAnimationFrame(animate);

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(frameRef.current);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointerleave", onPointerUp);
      container.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);

      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      rendererRef.current = null;
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
