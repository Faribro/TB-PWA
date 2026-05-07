'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'

interface AuthProviderProps {
  children: ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider 
      refetchInterval={0} // Disable automatic refetching to prevent ClientFetchError
      refetchOnWindowFocus={false} // Don't refetch on window focus to prevent errors
    >
      {children}
    </SessionProvider>
  )
}