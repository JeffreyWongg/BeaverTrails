/**
 * AmbientEngine — procedural ambient soundscapes using the Web Audio API.
 *
 * Generates calm, location-specific ambient pads from layered sine oscillators
 * and filtered noise. Zero network latency, infinitely variable.
 */

// ── Preset definitions ──

interface AmbientPreset {
  /** Frequencies for the drone oscillators (Hz) */
  tones: number[];
  /** Detune amount in cents for warmth / shimmer */
  detuneCents: number;
  /** Noise lowpass cutoff (Hz) — lower = warmer, higher = brighter */
  noiseCutoff: number;
  /** Noise volume relative to master (0-1) */
  noiseGain: number;
  /** LFO speed for filter modulation (Hz, 0 = none) */
  lfoRate: number;
  /** LFO depth in Hz applied to noise filter cutoff */
  lfoDepth: number;
}

const PRESETS: Record<string, AmbientPreset> = {
  nature: {
    tones: [261.63, 329.63, 392.0], // C4 major — bright & cheerful
    detuneCents: 4,
    noiseCutoff: 1800, // airy high-frequency shimmer
    noiseGain: 0.06,   // gentle breeze, not wind tunnel
    lfoRate: 0.15,     // soft gentle sway
    lfoDepth: 300,
  },
  ocean: {
    tones: [261.63, 329.63, 493.88], // C4-E4-B4 — warm, open
    detuneCents: 5,
    noiseCutoff: 2200,  // bright, sparkly water
    noiseGain: 0.09,    // gentle surf wash
    lfoRate: 0.18,      // slow wave rhythm
    lfoDepth: 500,
  },
  mountain: {
    tones: [293.66, 392.0, 440.0], // D4-G4-A4 — open, airy
    detuneCents: 4,
    noiseCutoff: 1600,
    noiseGain: 0.05,    // light breeze
    lfoRate: 0.1,
    lfoDepth: 250,
  },
  urban: {
    tones: [261.63, 311.13, 392.0], // C4-Eb4-G4 — warm, jazzy
    detuneCents: 3,
    noiseCutoff: 1200,
    noiseGain: 0.04,    // subtle city hum
    lfoRate: 0.08,
    lfoDepth: 150,
  },
  historic: {
    tones: [293.66, 349.23, 440.0], // D4-F4-A4 — Dm, gentle & reflective
    detuneCents: 5,
    noiseCutoff: 1400,
    noiseGain: 0.05,
    lfoRate: 0.12,
    lfoDepth: 200,
  },
  ethereal: {
    tones: [329.63, 440.0, 523.25], // E4-A4-C5 — bright, dreamy
    detuneCents: 8,      // shimmery
    noiseCutoff: 2500,   // sparkle
    noiseGain: 0.05,
    lfoRate: 0.2,
    lfoDepth: 600,
  },
  winter: {
    tones: [329.63, 392.0, 493.88], // E4-G4-B4 — Em, gentle & serene
    detuneCents: 6,
    noiseCutoff: 2000,   // crisp, bright
    noiseGain: 0.07,     // light snow texture
    lfoRate: 0.08,
    lfoDepth: 300,
  },
  night: {
    tones: [261.63, 329.63, 392.0], // C4 major — peaceful, not spooky
    detuneCents: 6,
    noiseCutoff: 1500,
    noiseGain: 0.04,     // soft crickets-level
    lfoRate: 0.1,
    lfoDepth: 200,
  },
};

// Keywords → preset mapping
const KEYWORD_MAP: [string[], string][] = [
  [["ocean", "beach", "lake", "river", "harbour", "harbor", "bay", "sea", "coast", "shore", "waterfront", "wharf", "pier"], "ocean"],
  [["mountain", "peak", "summit", "ridge", "alpine", "cliff", "canyon", "gorge", "valley", "trail", "hike", "hiking"], "mountain"],
  [["city", "urban", "downtown", "market", "district", "tower", "street", "square", "metro"], "urban"],
  [["museum", "historic", "heritage", "fort", "castle", "church", "cathedral", "parliament", "monument", "memorial"], "historic"],
  [["night", "evening", "dark", "sunset", "dusk", "midnight", "starry"], "night"],
  [["winter", "snow", "ice", "frozen", "cold", "frost", "blizzard", "snowstorm"], "winter"],
  [["magic", "fantasy", "dream", "ethereal", "alien", "surreal", "imagine", "mystical", "enchanted", "aurora"], "ethereal"],
  [["park", "garden", "forest", "wood", "meadow", "field", "farm", "vineyard", "nature", "botanical"], "nature"],
];

/** Determine the best preset for a location/scene description */
export function resolvePreset(text: string): string {
  const lower = text.toLowerCase();
  for (const [keywords, preset] of KEYWORD_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) return preset;
  }
  return "nature"; // calm default
}

// ── Engine ──

export class AmbientEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private oscGains: GainNode[] = [];
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private _playing = false;
  private _maxVolume = 0.36;

  get playing() {
    return this._playing;
  }

  /** Start playing ambient for a given scene description */
  async play(sceneText: string, maxVolume = 0.36) {
    this.stop(); // clean up any previous session
    this._maxVolume = maxVolume;

    const presetKey = resolvePreset(sceneText);
    const preset = PRESETS[presetKey] || PRESETS.nature;

    this.ctx = new AudioContext();
    const ctx = this.ctx;

    // Master gain — start at 0, fade in
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, ctx.currentTime);
    this.masterGain.connect(ctx.destination);

    // ── Oscillator pad — triangle waves for warm, gentle tones ──
    for (const freq of preset.tones) {
      // Each tone gets two slightly detuned oscillators for shimmer
      for (const detune of [-preset.detuneCents, preset.detuneCents]) {
        const osc = ctx.createOscillator();
        osc.type = "triangle"; // warm & soft — no harsh harmonics
        osc.frequency.value = freq;
        osc.detune.value = detune;

        // Per-voice lowpass to soften further
        const voiceFilter = ctx.createBiquadFilter();
        voiceFilter.type = "lowpass";
        voiceFilter.frequency.value = 1200; // roll off highs for pillowy sound
        voiceFilter.Q.value = 0.5;

        const gain = ctx.createGain();
        gain.gain.value = 0.25 / (preset.tones.length * 2); // balanced per-voice
        osc.connect(voiceFilter);
        voiceFilter.connect(gain);
        gain.connect(this.masterGain);
        osc.start();

        this.oscillators.push(osc);
        this.oscGains.push(gain);
      }
    }

    // ── Pink-ish noise ──
    const bufferSize = ctx.sampleRate * 4; // 4 seconds of noise, looped
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    // Simple pink noise approximation (Paul Kellet's method)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    this.noiseSource = ctx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;

    // Bandpass filter — keeps only the gentle mid-high frequencies
    // (removes the low rumble that sounds ominous)
    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = "bandpass";
    this.noiseFilter.frequency.value = preset.noiseCutoff;
    this.noiseFilter.Q.value = 0.4; // wide band = soft & natural

    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = preset.noiseGain;

    this.noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);
    this.noiseSource.start();

    // ── LFO on noise filter ──
    if (preset.lfoRate > 0) {
      this.lfo = ctx.createOscillator();
      this.lfo.type = "sine";
      this.lfo.frequency.value = preset.lfoRate;

      this.lfoGain = ctx.createGain();
      this.lfoGain.gain.value = preset.lfoDepth;

      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.noiseFilter.frequency);
      this.lfo.start();
    }

    // Fade in over 3 seconds
    this.masterGain.gain.linearRampToValueAtTime(
      this._maxVolume,
      ctx.currentTime + 3
    );

    this._playing = true;
  }

  /** Fade out and stop all audio */
  stop() {
    if (!this.ctx || !this._playing) {
      this._cleanup();
      return;
    }

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Fade out over 1.5 seconds
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0, now + 1.5);
    }

    // Schedule cleanup after fade
    setTimeout(() => this._cleanup(), 1800);
    this._playing = false;
  }

  /** Set volume (0-1 scale, mapped to maxVolume) */
  setVolume(v: number) {
    if (!this.masterGain || !this.ctx) return;
    const target = v * this._maxVolume;
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(
      target,
      this.ctx.currentTime + 0.3
    );
  }

  /** Mute / unmute */
  setMuted(muted: boolean) {
    this.setVolume(muted ? 0 : 1);
  }

  private _cleanup() {
    for (const osc of this.oscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
      try { osc.disconnect(); } catch { /* ok */ }
    }
    this.oscillators = [];
    this.oscGains = [];

    if (this.noiseSource) {
      try { this.noiseSource.stop(); } catch { /* ok */ }
      try { this.noiseSource.disconnect(); } catch { /* ok */ }
      this.noiseSource = null;
    }
    if (this.lfo) {
      try { this.lfo.stop(); } catch { /* ok */ }
      try { this.lfo.disconnect(); } catch { /* ok */ }
      this.lfo = null;
    }
    if (this.noiseFilter) { try { this.noiseFilter.disconnect(); } catch { /* ok */ } this.noiseFilter = null; }
    if (this.noiseGain) { try { this.noiseGain.disconnect(); } catch { /* ok */ } this.noiseGain = null; }
    if (this.lfoGain) { try { this.lfoGain.disconnect(); } catch { /* ok */ } this.lfoGain = null; }
    if (this.masterGain) { try { this.masterGain.disconnect(); } catch { /* ok */ } this.masterGain = null; }

    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
  }
}
