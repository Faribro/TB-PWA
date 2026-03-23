/**
 * Design Tokens - Color System
 * Ensures consistent colors across the application
 */
export const COLORS = {
  // Primary Actions
  primary: {
    bg: 'bg-blue-600',
    bgHover: 'hover:bg-blue-700',
    text: 'text-blue-600',
    border: 'border-blue-600',
    gradient: 'from-blue-500 to-blue-600',
  },
  
  // Success Actions
  success: {
    bg: 'bg-emerald-600',
    bgHover: 'hover:bg-emerald-700',
    text: 'text-emerald-600',
    border: 'border-emerald-600',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  
  // Destructive Actions
  destructive: {
    bg: 'bg-red-600',
    bgHover: 'hover:bg-red-700',
    text: 'text-red-600',
    border: 'border-red-600',
    gradient: 'from-red-500 to-red-600',
  },
  
  // Warning
  warning: {
    bg: 'bg-amber-600',
    bgHover: 'hover:bg-amber-700',
    text: 'text-amber-600',
    border: 'border-amber-600',
    gradient: 'from-amber-500 to-amber-600',
  },
  
  // Neutral
  neutral: {
    bg: 'bg-slate-900',
    bgHover: 'hover:bg-slate-800',
    text: 'text-slate-900',
    border: 'border-slate-900',
    gradient: 'from-slate-800 to-slate-900',
  },
} as const;

/**
 * Button Size Variants
 */
export const BUTTON_SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
} as const;

/**
 * Border Radius Variants
 */
export const RADIUS = {
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  full: 'rounded-full',
} as const;

/**
 * Map Visualization Colors
 */
export const MAP_COLORS = {
  breach: {
    critical: [153, 27, 27, 255],    // >90% breach - Deep red
    high: [239, 68, 68, 220],         // >70% breach - Red
    warning: [245, 158, 11, 200],     // 40-60% breach - Amber
    good: [16, 185, 129, 220],        // <20% breach - Emerald
    neutral: [100, 116, 139, 160],    // Neutral - Slate
  },
  screened: {
    veryHigh: [79, 70, 229, 220],     // >80% intensity - Deep indigo
    high: [99, 102, 241, 200],        // >60% intensity - Indigo
    medium: [129, 140, 248, 180],     // >40% intensity - Light indigo
    low: [6, 182, 212, 160],          // >20% intensity - Cyan
    veryLow: [14, 165, 233, 140],     // <20% intensity - Sky blue
  },
  noData: [30, 41, 59, 100],          // Slate-800 for no data
} as const;

/**
 * Sonic Assistant Messages
 */
export const SONIC_MESSAGES = {
  error: {
    connection: "Sir, I'm having trouble reaching the intelligence matrix. Please check your connection.",
    analysis: "Analysis encountered interference Sir! Using local mode.",
    deepScan: "Deep scan encountered interference Sir! Using local analysis.",
  },
  success: {
    lensActivated: "Magic Lens activated Sir! Hold Alt and hover over districts for instant X-Ray analysis. Click to trigger my deep scan!",
    scanComplete: "Deep scan complete Sir! Analysis ready.",
  },
} as const;
