'use client'

import { Component, ReactNode } from 'react'
import { signOut } from 'next-auth/react'

interface AuthErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface AuthErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class AuthErrorBoundary extends Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): AuthErrorBoundaryState {
    // Check if it's an Auth.js ClientFetchError
    if (error.message.includes('ClientFetchError') || error.message.includes('Failed to fetch')) {
      console.warn('[AuthErrorBoundary] Auth.js fetch error detected, handling gracefully')
      return { hasError: true, error }
    }
    
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[AuthErrorBoundary] Auth error caught:', error, errorInfo)
    
    // If it's an auth fetch error, sign out to clear the corrupted session
    if (error.message.includes('ClientFetchError') || error.message.includes('Failed to fetch')) {
      signOut({ redirect: false }).catch(console.error)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="text-center p-6">
            <div className="text-amber-600 text-sm font-medium mb-2">
              Authentication session expired
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined })
                window.location.reload()
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
