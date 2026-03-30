/**
 * SAMADHAAN Sound System
 * All sounds generated via Web Audio API — no files, no latency.
 * Respects prefers-reduced-motion (also mutes sounds).
 * User can toggle off via settings (stored in module-level variable).
 */

let audioCtx: AudioContext | null = null
let enabled = true  // user preference — can be toggled

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  // Resume if suspended (browsers require user gesture first)
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

function shouldPlay(): boolean {
  if (!enabled) return false
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return true
}

// ─── SOUND PRIMITIVES ────────────────────────────────────────

function playTone(
  frequency: number,
  duration: number,
  volume: number = 0.15,
  type: OscillatorType = 'sine',
  fadeIn: number = 0.005,
  fadeOut: number = 0.05
) {
  if (!shouldPlay()) return
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = type
    osc.frequency.setValueAtTime(frequency, ctx.currentTime)

    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + fadeIn)
    gain.gain.setValueAtTime(volume, ctx.currentTime + duration - fadeOut)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch (e) {
    // Silently fail — audio is enhancement, not core functionality
  }
}

function playChord(
  frequencies: number[],
  duration: number,
  volume: number = 0.08
) {
  frequencies.forEach((f, i) => {
    setTimeout(() => playTone(f, duration, volume), i * 15)
  })
}

// ─── SAMADHAAN SOUND LIBRARY ─────────────────────────────────

export const sounds = {

  // Sidebar navigation tap — soft click, like a keyboard key
  // Frequency: two quick tones, rising
  navTab: () => {
    playTone(440, 0.08, 0.1, 'sine')
    setTimeout(() => playTone(554, 0.08, 0.08, 'sine'), 40)
  },

  // Generic button click — crisp, confident single tap
  buttonClick: () => {
    playTone(600, 0.06, 0.12, 'sine', 0.001, 0.04)
  },

  // Primary CTA — slightly richer than button click
  primaryAction: () => {
    playTone(523, 0.1, 0.14, 'sine')
    setTimeout(() => playTone(659, 0.12, 0.1, 'sine'), 50)
  },

  // Success — warm ascending chime (C-E-G triad)
  success: () => {
    playTone(523.25, 0.18, 0.12, 'sine')  // C5
    setTimeout(() => playTone(659.25, 0.18, 0.1, 'sine'), 80)   // E5
    setTimeout(() => playTone(783.99, 0.25, 0.1, 'sine'), 160)  // G5
  },

  // Form submit success — used after patient record saved
  formSubmit: () => {
    playChord([523.25, 659.25, 783.99], 0.4, 0.09)
    setTimeout(() => playTone(1046.5, 0.3, 0.07, 'sine'), 200)  // C6
  },

  // Error / warning — minor tone, not alarming
  error: () => {
    playTone(440, 0.15, 0.12, 'sine')
    setTimeout(() => playTone(415, 0.2, 0.1, 'sine'), 100)
  },

  // Alert — TB high alert case detected (attention-grabbing but not alarming)
  alert: () => {
    playTone(880, 0.1, 0.15, 'sine')
    setTimeout(() => playTone(1108, 0.1, 0.12, 'sine'), 120)
    setTimeout(() => playTone(880, 0.15, 0.1, 'sine'), 240)
  },

  // Delete confirm — low warning tone
  deleteConfirm: () => {
    playTone(330, 0.2, 0.1, 'sine', 0.01, 0.08)
  },

  // Toggle switch — light tick
  toggle: () => {
    playTone(800, 0.04, 0.08, 'sine', 0.001, 0.02)
  },

  // Calendar day click — soft wood-block like tap
  calendarClick: () => {
    playTone(700, 0.06, 0.1, 'triangle', 0.001, 0.04)
  },

  // Export / download — descending sweep
  download: () => {
    const ctx = getCtx()
    if (!shouldPlay()) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
    } catch (e) {}
  },

  // Login / dashboard load — gentle ambient startup chord
  login: () => {
    setTimeout(() => playTone(261.63, 0.5, 0.06, 'sine'), 0)    // C4
    setTimeout(() => playTone(329.63, 0.5, 0.05, 'sine'), 100)  // E4
    setTimeout(() => playTone(392.00, 0.6, 0.05, 'sine'), 200)  // G4
    setTimeout(() => playTone(523.25, 0.7, 0.04, 'sine'), 350)  // C5
  },

  // VANGUARD terminal access — cyberpunk sweep up
  vanguardAccess: () => {
    const ctx = getCtx()
    if (!shouldPlay()) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(200, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.4)
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch (e) {}
    // Add a confirmation chord after
    setTimeout(() => playChord([523, 659, 784], 0.5, 0.06), 500)
  },

}

// ─── SETTINGS ────────────────────────────────────────────────

export function setSoundEnabled(value: boolean) {
  enabled = value
}

export function isSoundEnabled() {
  return enabled
}
