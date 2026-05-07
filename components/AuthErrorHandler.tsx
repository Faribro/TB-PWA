'use client'

import { useEffect } from 'react'

export function AuthErrorHandler() {
  useEffect(() => {
    // Suppress ClientFetchError from Auth.js to prevent console spam
    const originalConsoleError = console.error
    
    console.error = (...args) => {
      // Filter out Auth.js ClientFetchError messages
      const message = args[0]
      if (
        typeof message === 'string' && 
        (message.includes('ClientFetchError') || 
         message.includes('Failed to fetch') ||
         message.includes('https://errors.authjs.dev'))
      ) {
        // Suppress these specific Auth.js errors
        return
      }
      // Log other errors normally
      originalConsoleError.apply(console, args)
    }

    return () => {
      // Restore original console.error on cleanup
      console.error = originalConsoleError
    }
  }, [])

  return null // This component doesn't render anything
}
