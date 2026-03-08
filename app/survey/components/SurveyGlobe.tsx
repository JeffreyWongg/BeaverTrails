export default function SurveyGlobe() {
  return (
    <div className="fixed inset-0 pointer-events-none select-none z-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/surveybg.png"
        alt=""
        className="w-full h-full object-cover"
        style={{
          filter: "brightness(1.05) saturate(0.85)",
          opacity: 0.92,
        }}
      />
      {/* Soft vignette so edges blend into the card */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at center, transparent 40%, rgba(253,250,246,0.55) 100%)",
        }}
      />
    </div>
  );
}
