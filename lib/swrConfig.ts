import { SWRConfiguration } from 'swr';

export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  revalidateIfStale: false,
  dedupingInterval: 10000,
  focusThrottleInterval: 30000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  keepPreviousData: true,
  refreshInterval: 0,
  compare: (a: any, b: any) => {
    // Custom comparison to prevent unnecessary re-renders
    if (a === b) return true;
    if (!a || !b) return false;
    
    // For arrays, compare length and first/last items
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      if (a.length === 0) return true;
      return a[0] === b[0] && a[a.length - 1] === b[a.length - 1];
    }
    
    // For objects, shallow comparison
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every(key => a[key] === b[key]);
    }
    
    return false;
  },
};

export const swrPaginatedConfig: SWRConfiguration = {
  ...swrConfig,
  revalidateOnMount: false,
  dedupingInterval: 30000,
  keepPreviousData: true,
};

export const swrAllPatientsConfig: SWRConfiguration = {
  ...swrConfig,
  revalidateOnMount: true,
  dedupingInterval: 1800000, // 30 minutes
  focusThrottleInterval: 300000, // 5 minutes
};
