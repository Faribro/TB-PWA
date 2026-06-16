'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { motion } from 'framer-motion';


interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCount: number;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    this.setState(prev => ({
      errorInfo,
      errorCount: prev.errorCount + 1,
    }));

    this.props.onError?.(error, errorInfo);

    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService(error: Error, errorInfo: React.ErrorInfo) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
    };
    
    console.error('[Production Error]', errorData);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (this.state.errorCount >= 3) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl w-full"
          >
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-rose-500 to-red-600 p-8 text-white">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black tracking-tight">Something Went Wrong</h1>
                    <p className="text-rose-100 text-sm mt-1">The application encountered an unexpected error</p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Error Details</p>
                  <p className="text-sm font-mono text-slate-900 break-all">
                    {this.state.error?.message || 'Unknown error'}
                  </p>
                  {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                    <details className="mt-4">
                      <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700 font-semibold">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 text-xs text-slate-600 overflow-auto max-h-48 bg-slate-100 p-4 rounded-xl">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={this.handleReset}
                    className="flex flex-col items-center gap-3 p-6 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition-all group"
                  >
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <RefreshCw className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-900">Try Again</p>
                      <p className="text-xs text-slate-500 mt-1">Reset component</p>
                    </div>
                  </button>

                  <button
                    onClick={this.handleReload}
                    className="flex flex-col items-center gap-3 p-6 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition-all group"
                  >
                    <div className="w-12 h-12 bg-violet-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <RefreshCw className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-900">Reload Page</p>
                      <p className="text-xs text-slate-500 mt-1">Fresh start</p>
                    </div>
                  </button>

                  <button
                    onClick={this.handleGoHome}
                    className="flex flex-col items-center gap-3 p-6 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition-all group"
                  >
                    <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Home className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-900">Go Home</p>
                      <p className="text-xs text-slate-500 mt-1">Dashboard</p>
                    </div>
                  </button>
                </div>

                {this.state.errorCount >= 2 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <p className="text-sm text-amber-900 font-semibold">
                      ⚠️ Multiple errors detected. Auto-reloading in 2 seconds...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundaryClass;
