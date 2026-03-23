import React from 'react';

// Performance Monitoring Utility
// Meta/Google-level performance tracking

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, number> = new Map();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string): number {
    const startTime = this.marks.get(startMark);
    if (!startTime) {
      console.warn(`[Perf] Start mark "${startMark}" not found`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Perf] ${name}: ${duration.toFixed(2)}ms`);
    }

    this.marks.delete(startMark);
    return duration;
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  clearMetrics(): void {
    this.metrics = [];
    this.marks.clear();
  }

  getAverageByName(name: string): number {
    const filtered = this.metrics.filter(m => m.name === name);
    if (filtered.length === 0) return 0;
    
    const sum = filtered.reduce((acc, m) => acc + m.duration, 0);
    return sum / filtered.length;
  }

  logSummary(): void {
    if (this.metrics.length === 0) {
      console.log('[Perf] No metrics recorded');
      return;
    }

    const grouped = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric.duration);
      return acc;
    }, {} as Record<string, number[]>);

    console.group('[Perf] Performance Summary');
    Object.entries(grouped).forEach(([name, durations]) => {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      console.log(`${name}: avg=${avg.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms, count=${durations.length}`);
    });
    console.groupEnd();
  }
}

export const perfMonitor = new PerformanceMonitor();

// React Hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  if (typeof window === 'undefined') return;

  const markName = `${componentName}-render-start`;
  
  perfMonitor.mark(markName);

  return () => {
    perfMonitor.measure(`${componentName}-render`, markName);
  };
}

// HOC for automatic performance tracking
export function withPerformanceTracking<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  const name = componentName || Component.displayName || Component.name || 'Unknown';
  
  return function PerformanceTrackedComponent(props: P) {
    const cleanup = usePerformanceTracking(name);
    
    React.useEffect(() => {
      return cleanup;
    });

    return React.createElement(Component, props);
  };
}
