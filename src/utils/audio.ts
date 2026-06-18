// Programmatic Sound Synthesizer using Web Audio API for a lightweight, offline-safe, instant response

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    // Standard and Webkit support
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  // Try to resume if suspended (due to autoplay policies)
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a high-pitched, sparkling chime arpeggio for draft picks
 */
export function playDraftChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Note frequencies for a ascending celestial major arpeggio (C6, E6, G6, C7)
  const notes = [1046.50, 1318.51, 1567.98, 2093.00];
  
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

    // Dynamic clean envelope
    gainNode.gain.setValueAtTime(0, now + idx * 0.08);
    gainNode.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.45);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.5);
  });
}

/**
 * Play a professional double-blast referee whistle sound using dual oscillators and frequency modulation
 */
export function playWhistle() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // We play two whistle blasts: a short one and a slightly longer one "Toot-Toooot!"
  const blasts = [
    { start: 0, duration: 0.15 },
    { start: 0.22, duration: 0.4 }
  ];

  blasts.forEach((blast) => {
    const blastStart = now + blast.start;
    const blastEnd = blastStart + blast.duration;

    // Dual-frequency oscillators to create the traditional "beating" frequency of a sports referee whistle
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    
    // Frequency modulation oscillator to simulate the trill/vibration of the pea inside the whistle
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    const mainGain = ctx.createGain();
    const bandpass = ctx.createBiquadFilter();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(2000, blastStart); // Base high whistle pitch

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(2050, blastStart); // Beating pitch

    lfo.frequency.setValueAtTime(32, blastStart); // 32 Hz vibration
    lfoGain.gain.setValueAtTime(120, blastStart); // Pitch variation width

    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(2025, blastStart);
    bandpass.Q.setValueAtTime(2, blastStart);

    // Connect LFO (Vibration)
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    // Connect audio signal flow
    osc1.connect(mainGain);
    osc2.connect(mainGain);
    mainGain.connect(bandpass);
    bandpass.connect(ctx.destination);

    // Volume Envelope
    mainGain.gain.setValueAtTime(0, blastStart);
    mainGain.gain.linearRampToValueAtTime(0.15, blastStart + 0.03); // Quick attack
    mainGain.gain.setValueAtTime(0.15, blastEnd - 0.05);
    mainGain.gain.exponentialRampToValueAtTime(0.0001, blastEnd); // Fast decay

    // Start elements
    lfo.start(blastStart);
    osc1.start(blastStart);
    osc2.start(blastStart);

    lfo.stop(blastEnd);
    osc1.stop(blastEnd);
    osc2.stop(blastEnd);
  });
}

/**
 * Play a crowd cheering roar programmatically using filtered white noise with randomized sweeps
 */
export function playGoalCheer() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 3.5; // 3.5 seconds crowd celebration

  // 1. Generate a continuous buffer of white noise
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    // White noise formula
    data[i] = Math.random() * 2 - 1;
  }

  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = buffer;

  // 2. Add filters to mold the white noise into a realistic roaring crowd cheer
  // Low-pass filter to make it "roomy" (stadium size)
  const lowFilter = ctx.createBiquadFilter();
  lowFilter.type = "lowpass";
  lowFilter.frequency.setValueAtTime(350, now);
  // Wave filter sweeps: crowd roars loud and peaks around 0.6 seconds, then slowly fades
  lowFilter.frequency.exponentialRampToValueAtTime(1100, now + 0.5);
  lowFilter.frequency.exponentialRampToValueAtTime(500, now + 2.0);
  lowFilter.frequency.exponentialRampToValueAtTime(250, now + duration);

  // Bandpass filter to add frequency peaks (simulating individual shouting frequencies)
  const bandFilter = ctx.createBiquadFilter();
  bandFilter.type = "bandpass";
  bandFilter.frequency.setValueAtTime(450, now);
  bandFilter.Q.setValueAtTime(1.2, now);
  bandFilter.frequency.exponentialRampToValueAtTime(800, now + 0.6);
  bandFilter.frequency.exponentialRampToValueAtTime(400, now + 2.2);

  // Gain (Volume) Envelope for the crowd surge
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.25, now + 0.15); // Surge instantly is heard
  gainNode.gain.exponentialRampToValueAtTime(0.35, now + 0.5); // Peak maximum roar excitement
  gainNode.gain.exponentialRampToValueAtTime(0.12, now + 1.8); // Steady clapping/sustained chanting phase
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration); // Fade out completely

  // Connect
  noiseNode.connect(lowFilter);
  lowFilter.connect(bandFilter);
  bandFilter.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Start crowd audio
  noiseNode.start(now);
  noiseNode.stop(now + duration);
}
