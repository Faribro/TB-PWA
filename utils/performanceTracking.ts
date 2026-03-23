// Performance monitoring with Web Vitals
export const reportWebVitals = (metric: any) => {
  if (process.env.NODE_ENV === 'production') {
    const { name, value, id } = metric;
    
    // Send to analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', name, {
        event_category: 'Web Vitals',
        value: Math.round(name === 'CLS' ? value * 1000 : value),
        event_label: id,
        non_interaction: true,
      });
    }
    
    // Log critical metrics
    if (name === 'LCP' && value > 2500) {
      console.warn(`⚠️ LCP is slow: ${value}ms`);
    }
    if (name === 'FID' && value > 100) {
      console.warn(`⚠️ FID is slow: ${value}ms`);
    }
    if (name === 'CLS' && value > 0.1) {
      console.warn(`⚠️ CLS is high: ${value}`);
    }
  }
};

// Component render tracking
export const trackComponentRender = (componentName: string) => {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      if (duration > 16) {
        console.warn(`🐌 ${componentName} render took ${duration.toFixed(2)}ms`);
      }
    };
  }
  return () => {};
};

// Memory leak detection
export const detectMemoryLeaks = () => {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    const memory = (performance as any).memory;
    if (memory) {
      const usedMB = memory.usedJSHeapSize / 1048576;
      const limitMB = memory.jsHeapSizeLimit / 1048576;
      const percentage = (usedMB / limitMB) * 100;
      
      if (percentage > 90) {
        console.error(`🚨 Memory usage critical: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB (${percentage.toFixed(1)}%)`);
      } else if (percentage > 75) {
        console.warn(`⚠️ Memory usage high: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB (${percentage.toFixed(1)}%)`);
      }
    }
  }
};

// Bundle size tracking
export const trackBundleSize = () => {
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsResources = resources.filter(r => r.name.endsWith('.js'));
    const totalSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    const totalSizeMB = totalSize / 1048576;
    
    if (totalSizeMB > 2) {
      console.warn(`📦 Total JS bundle size: ${totalSizeMB.toFixed(2)}MB`);
    }
  }
};

// API call performance
export const trackAPICall = (endpoint: string, duration: number) => {
  if (duration > 1000) {
    console.warn(`🐌 Slow API call to ${endpoint}: ${duration}ms`);
  }
};
