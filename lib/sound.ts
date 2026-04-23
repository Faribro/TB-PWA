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

  // Sidebar hover-open — subtle ambient lift
  drawerHoverOpen: () => {
    // Dense-air whoosh: filtered noise sweep with soft body
    if (!shouldPlay()) return
    try {
      const ctx = getCtx()
      const now = ctx.currentTime

      const bufferSize = Math.floor(ctx.sampleRate * 0.22)
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize
        const envelope = Math.sin(Math.PI * t) * 0.85
        data[i] = (Math.random() * 2 - 1) * envelope
      }

      const source = ctx.createBufferSource()
      source.buffer = buffer

      const hp = ctx.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.setValueAtTime(220, now)
      hp.frequency.exponentialRampToValueAtTime(420, now + 0.22)

      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.setValueAtTime(1200, now)
      bp.frequency.exponentialRampToValueAtTime(700, now + 0.22)
      bp.Q.value = 0.9

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)

      source.connect(hp)
      hp.connect(bp)
      bp.connect(gain)
      gain.connect(ctx.destination)
      source.start(now)

      // tiny low body tail for "dense air" feel
      const body = ctx.createOscillator()
      const bodyGain = ctx.createGain()
      body.type = 'sine'
      body.frequency.setValueAtTime(160, now)
      body.frequency.exponentialRampToValueAtTime(120, now + 0.2)
      bodyGain.gain.setValueAtTime(0.0001, now)
      bodyGain.gain.exponentialRampToValueAtTime(0.018, now + 0.03)
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2)
      body.connect(bodyGain)
      bodyGain.connect(ctx.destination)
      body.start(now)
      body.stop(now + 0.22)
    } catch (e) {}
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

  // New submission notification — gentle ascending chime
  newSubmission: () => {
    playTone(659.25, 0.15, 0.1, 'sine')  // E5
    setTimeout(() => playTone(783.99, 0.2, 0.08, 'sine'), 80)  // G5
  },

  // Water drop — calm, relaxing notification for new patient entry
  waterDrop: () => {
    if (!shouldPlay()) return
    try {
      const ctx = getCtx()
      const now = ctx.currentTime
      
      // Drop impact — high frequency with quick decay
      const drop = ctx.createOscillator()
      const dropGain = ctx.createGain()
      drop.type = 'sine'
      drop.frequency.setValueAtTime(1200, now)
      drop.frequency.exponentialRampToValueAtTime(400, now + 0.08)
      dropGain.gain.setValueAtTime(0.15, now)
      dropGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      drop.connect(dropGain)
      dropGain.connect(ctx.destination)
      drop.start(now)
      drop.stop(now + 0.15)
      
      // Ripple — soft resonance
      const ripple = ctx.createOscillator()
      const rippleGain = ctx.createGain()
      ripple.type = 'sine'
      ripple.frequency.setValueAtTime(300, now + 0.05)
      ripple.frequency.exponentialRampToValueAtTime(250, now + 0.4)
      rippleGain.gain.setValueAtTime(0, now + 0.05)
      rippleGain.gain.linearRampToValueAtTime(0.08, now + 0.1)
      rippleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
      ripple.connect(rippleGain)
      rippleGain.connect(ctx.destination)
      ripple.start(now + 0.05)
      ripple.stop(now + 0.4)
    } catch (e) {}
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

  // ─── SOUND 1: SYSTEM CRASH ───────────────────────────────
  // Triggered: 5 rapid taps to open VANGUARD
  // Feeling: Crashing through a firewall — chaotic, then controlled
  systemCrash: () => {
    if (!shouldPlay()) return
    try {
      const ctx = getCtx()
      const now = ctx.currentTime
      
      // Phase 1: System distortion — random noise burst (0-0.3s)
      const bufferSize = ctx.sampleRate * 0.3
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2)
      }
      const noise = ctx.createBufferSource()
      const noiseGain = ctx.createGain()
      const noiseFilter = ctx.createBiquadFilter()
      noise.buffer = buffer
      noiseFilter.type = 'bandpass'
      noiseFilter.frequency.setValueAtTime(800, now)
      noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.3)
      noiseFilter.Q.value = 2
      noiseGain.gain.setValueAtTime(0.3, now)
      noiseGain.gain.linearRampToValueAtTime(0, now + 0.3)
      noise.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(ctx.destination)
      noise.start(now)
      
      // Phase 2: Cascading frequency drop (0.1-0.5s) — system falling
      const sweep = ctx.createOscillator()
      const sweepGain = ctx.createGain()
      sweep.type = 'sawtooth'
      sweep.frequency.setValueAtTime(1200, now + 0.1)
      sweep.frequency.exponentialRampToValueAtTime(60, now + 0.5)
      sweepGain.gain.setValueAtTime(0.15, now + 0.1)
      sweepGain.gain.linearRampToValueAtTime(0, now + 0.5)
      sweep.connect(sweepGain)
      sweepGain.connect(ctx.destination)
      sweep.start(now + 0.1)
      sweep.stop(now + 0.5)
      
      // Phase 3: Glitch stutter — 3 rapid clicks (0.2-0.4s)
      ;[0.2, 0.28, 0.36].forEach(t => {
        const click = ctx.createOscillator()
        const clickGain = ctx.createGain()
        click.type = 'square'
        click.frequency.setValueAtTime(440, now + t)
        clickGain.gain.setValueAtTime(0.2, now + t)
        clickGain.gain.linearRampToValueAtTime(0, now + t + 0.04)
        click.connect(clickGain)
        clickGain.connect(ctx.destination)
        click.start(now + t)
        click.stop(now + t + 0.04)
      })
      
      // Phase 4: System re-initialization — rising confirmation (0.5-0.9s)
      ;[220, 330, 440, 660].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + 0.5 + i * 0.08)
        gain.gain.setValueAtTime(0.1, now + 0.5 + i * 0.08)
        gain.gain.linearRampToValueAtTime(0, now + 0.65 + i * 0.08)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + 0.5 + i * 0.08)
        osc.stop(now + 0.65 + i * 0.08)
      })
    } catch (e) {}
  },

  // ─── SOUND 2: BREACH ACCESS ──────────────────────────────
  // Triggered: Submit key in VANGUARD terminal (correct password)
  // Feeling: Breaking through encrypted layers — Matrix-like tunnel
  breachAccess: () => {
    if (!shouldPlay()) return
    try {
      const ctx = getCtx()
      const now = ctx.currentTime
      
      // Rapid ascending arpeggio — "tunneling through encryption"
      const freqs = [110, 220, 330, 440, 550, 660, 880, 1100, 1320, 1760]
      freqs.forEach((freq, i) => {
        const t = now + i * 0.05
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = i < 5 ? 'sawtooth' : 'sine'
        osc.frequency.setValueAtTime(freq, t)
        gain.gain.setValueAtTime(0.12 - i * 0.008, t)
        gain.gain.linearRampToValueAtTime(0, t + 0.08)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.08)
      })
      
      // Concurrent low rumble — power surge
      const rumble = ctx.createOscillator()
      const rumbleGain = ctx.createGain()
      rumble.type = 'sine'
      rumble.frequency.setValueAtTime(40, now)
      rumble.frequency.exponentialRampToValueAtTime(80, now + 0.5)
      rumbleGain.gain.setValueAtTime(0, now)
      rumbleGain.gain.linearRampToValueAtTime(0.2, now + 0.1)
      rumbleGain.gain.linearRampToValueAtTime(0, now + 0.5)
      rumble.connect(rumbleGain)
      rumbleGain.connect(ctx.destination)
      rumble.start(now)
      rumble.stop(now + 0.5)
      
      // Final confirmation chord — "ACCESS GRANTED"
      ;[523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + 0.52)
        gain.gain.setValueAtTime(0.12, now + 0.52)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now + 0.52)
        osc.stop(now + 1.2)
      })
    } catch (e) {}
  },

  // ─── SOUND 3: GLASS SHATTER LOGIN ────────────────────────
  // Triggered: "Sign in with Google" click on login page
  // Feeling: Shattering glass → rushing through → landing confirmation
  glassShatterLogin: () => {
    if (!shouldPlay()) return
    try {
      const ctx = getCtx()
      const now = ctx.currentTime

      // Phase 1: Glass impact + shatter (0-0.15s)
      // High-frequency burst simulating glass crack
      const impactBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate)
      const impactData = impactBuffer.getChannelData(0)
      for (let i = 0; i < impactData.length; i++) {
        const t = i / ctx.sampleRate
        const decay = Math.exp(-t * 30)
        impactData[i] = (Math.random() * 2 - 1) * decay * 0.5
      }
      const impact = ctx.createBufferSource()
      const impactFilter = ctx.createBiquadFilter()
      const impactGain = ctx.createGain()
      impact.buffer = impactBuffer
      impactFilter.type = 'highpass'
      impactFilter.frequency.value = 3000
      impactGain.gain.setValueAtTime(0.4, now)
      impactGain.gain.linearRampToValueAtTime(0, now + 0.15)
      impact.connect(impactFilter)
      impactFilter.connect(impactGain)
      impactGain.connect(ctx.destination)
      impact.start(now)

      // Phase 2: Shard tinkles — 5 random high-freq decays (0.05-0.3s)
      ;[2800, 3400, 4200, 5100, 6000].forEach((freq, i) => {
        const tinkle = ctx.createOscillator()
        const tGain = ctx.createGain()
        tinkle.type = 'sine'
        const startT = now + 0.05 + i * 0.04 + Math.random() * 0.02
        tinkle.frequency.setValueAtTime(freq, startT)
        tinkle.frequency.exponentialRampToValueAtTime(freq * 0.7, startT + 0.15)
        tGain.gain.setValueAtTime(0.08, startT)
        tGain.gain.exponentialRampToValueAtTime(0.001, startT + 0.2)
        tinkle.connect(tGain)
        tGain.connect(ctx.destination)
        tinkle.start(startT)
        tinkle.stop(startT + 0.2)
      })

      // Phase 3: Whoosh — "rushing into the system" (0.1-0.5s)
      const whooshBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate)
      const whooshData = whooshBuffer.getChannelData(0)
      for (let i = 0; i < whooshData.length; i++) {
        whooshData[i] = (Math.random() * 2 - 1) * 0.15
      }
      const whoosh = ctx.createBufferSource()
      const whooshFilter = ctx.createBiquadFilter()
      const whooshGain = ctx.createGain()
      whoosh.buffer = whooshBuffer
      whooshFilter.type = 'bandpass'
      whooshFilter.frequency.setValueAtTime(4000, now + 0.1)
      whooshFilter.frequency.exponentialRampToValueAtTime(200, now + 0.5)
      whooshFilter.Q.value = 1.5
      whooshGain.gain.setValueAtTime(0, now + 0.1)
      whooshGain.gain.linearRampToValueAtTime(0.25, now + 0.2)
      whooshGain.gain.linearRampToValueAtTime(0, now + 0.5)
      whoosh.connect(whooshFilter)
      whooshFilter.connect(whooshGain)
      whooshGain.connect(ctx.destination)
      whoosh.start(now + 0.1)

      // Phase 4: Landing confirmation — soft chime (0.5s)
      ;[523.25, 783.99].forEach((freq, i) => {
        const conf = ctx.createOscillator()
        const cGain = ctx.createGain()
        conf.type = 'sine'
        conf.frequency.setValueAtTime(freq, now + 0.52 + i * 0.06)
        cGain.gain.setValueAtTime(0.1, now + 0.52 + i * 0.06)
        cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9 + i * 0.06)
        conf.connect(cGain)
        cGain.connect(ctx.destination)
        conf.start(now + 0.52 + i * 0.06)
        conf.stop(now + 0.9 + i * 0.06)
      })
    } catch (e) {}
  },

}

// ─── SETTINGS ────────────────────────────────────────────────

export function setSoundEnabled(value: boolean) {
  enabled = value
}

export function isSoundEnabled() {
  return enabled
}
