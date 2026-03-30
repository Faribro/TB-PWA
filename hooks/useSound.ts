'use client'

import { useCallback } from 'react'
import { sounds, setSoundEnabled, isSoundEnabled } from '@/lib/sound'

export function useSound() {
  return {
    play: useCallback((name: keyof typeof sounds) => {
      sounds[name]?.()
    }, []),
    sounds,
    enable: () => setSoundEnabled(true),
    disable: () => setSoundEnabled(false),
    isEnabled: isSoundEnabled,
  }
}
