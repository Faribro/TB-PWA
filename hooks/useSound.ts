'use client'

import { useCallback, useState, useEffect } from 'react'

// Safe wrapper for sound module with error handling
let soundModule: any = null
let moduleLoaded = false

// Lazy load the sound module to avoid chunk loading errors
async function loadSoundModule() {
  if (moduleLoaded) return soundModule
  try {
    soundModule = await import('@/lib/sound')
    moduleLoaded = true
  } catch (e) {
    console.warn('[useSound] Failed to load sound module:', e)
    soundModule = null
  }
  return soundModule
}

// Initialize on first use
loadSoundModule()

export function useSound() {
  const [loaded, setLoaded] = useState(moduleLoaded)

  useEffect(() => {
    if (!loaded) {
      loadSoundModule().then(() => setLoaded(true))
    }
  }, [loaded])

  const play = useCallback((name: string) => {
    if (soundModule?.sounds?.[name]) {
      try {
        soundModule.sounds[name]()
      } catch (e) {
        // Silent fail for sound errors
      }
    }
  }, [])

  return {
    play,
    sounds: soundModule?.sounds || {},
    enable: () => soundModule?.setSoundEnabled?.(true),
    disable: () => soundModule?.setSoundEnabled?.(false),
    isEnabled: soundModule?.isSoundEnabled?.() ?? false,
  }
}
