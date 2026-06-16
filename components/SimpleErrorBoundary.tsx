"use client";


import { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

interface Props {
  children: ReactNode;
}

function ErrorFallback({ error, resetErrorBoundary }: { error: any; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Something went wrong</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-mono text-red-900">
            {error?.message || 'Unknown error'}
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={resetErrorBoundary}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 font-semibold"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SimpleErrorBoundary({ children }: Props) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Optional: clear state or cache on reset
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

