'use client'

import { useEffect } from 'react'

export function AudioContextInitializer() {
  useEffect(() => {
    const prime = () => {
      // Silently initialize AudioContext on first interaction
      import('@/lib/sound').then(() => {
        // Context is now ready for use
      })
      window.removeEventListener('click', prime)
    }
    window.addEventListener('click', prime, { once: true })
    
    return () => {
      window.removeEventListener('click', prime)
    }
  }, [])

  return null
}
