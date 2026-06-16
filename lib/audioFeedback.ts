// Web Audio API - Institutional Sound Synthesis
// No external files required - pure synthesis

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function playInstitutionalPing() {
  if (typeof window === 'undefined') return;

  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Oscillator for high-frequency ping
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  // Clean institutional tone: 1200Hz
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);

  // Sharp attack, quick decay
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

  osc.start(now);
  osc.stop(now + 0.15);
}

export function playDataPacketChase() {
  if (typeof window === 'undefined') return;

  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Ascending sweep for "data in flight"
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(1600, now + 0.3);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

  osc.start(now);
  osc.stop(now + 0.3);
}

export function playSuccessChime() {
  if (typeof window === 'undefined') return;

  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Two-tone success chime
  [800, 1200].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(freq, now + i * 0.1);

    gain.gain.setValueAtTime(0, now + i * 0.1);
    gain.gain.linearRampToValueAtTime(0.25, now + i * 0.1 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);

    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.2);
  });
}

export function playErrorBuzz() {
  if (typeof window === 'undefined') return;

  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  // Low harsh buzz
  osc.frequency.setValueAtTime(200, now);
  osc.type = 'sawtooth';

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

  osc.start(now);
  osc.stop(now + 0.25);
}
