/**
 * Centralized Z-Index Scale
 * Prevents z-index chaos and ensures consistent layering
 */
export const Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  overlay: 10000,
  drawer: 10001,
  modal: 10002,
  popover: 10003,
  toast: 10004,
  statusIndicator: 10005,
  diagnosticViewer: 150, // DiagnosticViewerSidePanel (above rail, below modals)
  omniBar: 100000,
  sonic: 100002,
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;
