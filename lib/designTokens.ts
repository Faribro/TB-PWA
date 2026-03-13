/**
 * HHXR Engine Design System
 * Tactical Glass Aesthetic - Mission-Critical Dashboard
 * 
 * All UI components MUST use these tokens for consistency.
 */

export const DESIGN_TOKENS = {
  // Border Radius - Unified across all panels
  borderRadius: {
    panel: 'rounded-2xl',      // 16px - All panels, cards, sidebars
    button: 'rounded-xl',       // 12px - All buttons, chips
    badge: 'rounded-full',      // Full - Pills, status indicators
  },

  // Backdrop Blur - Tactical Glass Effect
  backdropBlur: 'backdrop-blur-md',

  // Borders - Inactive vs Active states
  border: {
    inactive: 'border border-slate-700/50',
    active: 'border-2 border-cyan-500/60',
    danger: 'border-2 border-red-500/60',
    success: 'border-2 border-emerald-500/60',
  },

  // Backgrounds - Glassmorphism layers
  background: {
    panel: 'bg-slate-900/95',
    panelLight: 'bg-slate-900/80',
    overlay: 'bg-slate-950/95',
    active: 'bg-cyan-500/20',
    danger: 'bg-red-500/20',
    success: 'bg-emerald-500/20',
  },

  // Spacing - 4px Grid System (all values are multiples of 4)
  spacing: {
    xs: 4,    // 1 unit
    sm: 8,    // 2 units
    md: 12,   // 3 units
    lg: 16,   // 4 units
    xl: 20,   // 5 units
    xxl: 24,  // 6 units
  },

  // Z-Index Hierarchy - 3-tier system
  zIndex: {
    base: 'z-10',        // Static UI (legend, labels)
    interactive: 'z-20', // Interactive panels (KPIs, filters, sidebars)
    overlay: 'z-30',     // Tooltips, modals, dropdowns
  },

  // Layout Dimensions
  layout: {
    headerHeight: 64,      // px
    footerHeight: 80,      // px
    leftSidebarWidth: 280, // px
    rightSidebarWidth: 320,// px
    sidebarCollapsed: 48,  // px
  },

  // Transitions
  transition: {
    fast: 'transition-all duration-200',
    normal: 'transition-all duration-300',
    slow: 'transition-all duration-500',
  },

  // Shadows
  shadow: {
    sm: 'shadow-lg',
    md: 'shadow-xl',
    lg: 'shadow-2xl',
    glow: {
      cyan: 'shadow-2xl shadow-cyan-500/20',
      red: 'shadow-2xl shadow-red-500/20',
      emerald: 'shadow-2xl shadow-emerald-500/20',
      amber: 'shadow-2xl shadow-amber-500/20',
    },
  },

  // Typography
  text: {
    label: 'text-xs uppercase tracking-widest font-semibold text-slate-400',
    value: 'text-2xl font-black text-white',
    valueLarge: 'text-4xl font-black text-white',
    context: 'text-xs text-slate-400',
  },
} as const;

// Helper function to get spacing value
export const getSpacing = (size: keyof typeof DESIGN_TOKENS.spacing): string => {
  return `${DESIGN_TOKENS.spacing[size]}px`;
};

// Helper function to build className strings
export const buildPanelClass = (active = false): string => {
  return `
    ${DESIGN_TOKENS.borderRadius.panel}
    ${DESIGN_TOKENS.backdropBlur}
    ${active ? DESIGN_TOKENS.border.active : DESIGN_TOKENS.border.inactive}
    ${active ? DESIGN_TOKENS.background.active : DESIGN_TOKENS.background.panel}
    ${DESIGN_TOKENS.shadow.md}
    ${DESIGN_TOKENS.transition.normal}
  `.trim().replace(/\s+/g, ' ');
};
