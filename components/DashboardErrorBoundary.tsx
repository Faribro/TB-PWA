'use client';

import React, { ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DashboardErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.componentName || 'Dashboard'}:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
          <div className="max-w-md w-full">
            <div className="bg-slate-800/50 border border-red-500/30 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/50">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
              </div>

              {/* Error Title */}
              <h2 className="text-2xl font-bold text-white text-center mb-3">
                Component Error
              </h2>

              {/* Error Message */}
              <p className="text-slate-300 text-sm text-center mb-6">
                {this.props.componentName && (
                  <span className="block text-red-400 font-semibold mb-2">
                    {this.props.componentName}
                  </span>
                )}
                {this.state.error?.message || 'An unexpected error occurred while rendering this component.'}
              </p>

              {/* Error Details (Dev Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-slate-900/50 rounded-lg p-4 mb-6 border border-slate-700/50 max-h-32 overflow-y-auto">
                  <p className="text-xs font-mono text-red-300 whitespace-pre-wrap break-words">
                    {this.state.error.stack}
                  </p>
                </div>
              )}

              {/* Retry Button */}
              <button
                onClick={this.handleRetry}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-red-500/20 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                Retry Component
              </button>

              {/* Help Text */}
              <p className="text-xs text-slate-400 text-center mt-4">
                If the problem persists, try refreshing the page or contact support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
