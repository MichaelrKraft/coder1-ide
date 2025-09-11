/**
 * Z-Index Design System
 * Centralized z-index management to prevent stacking conflicts
 */

export const Z_INDEX = {
  // Base elements
  base: 1,
  elevated: 10,
  
  // UI Components
  dropdown: 1000,
  tooltip: 1100,
  sticky: 1200,
  
  // Overlays
  overlay: 1300,
  
  // Modals (managed by modal stack)
  modalBackdrop: 1400,
  modalContent: 1410,
  
  // Notifications
  toast: 1500,
  
  // Debug/Development
  debug: 9999,
} as const;

// CSS custom properties for use in components
export const Z_INDEX_CSS_VARS = {
  '--z-base': Z_INDEX.base.toString(),
  '--z-elevated': Z_INDEX.elevated.toString(),
  '--z-dropdown': Z_INDEX.dropdown.toString(),
  '--z-tooltip': Z_INDEX.tooltip.toString(),
  '--z-sticky': Z_INDEX.sticky.toString(),
  '--z-overlay': Z_INDEX.overlay.toString(),
  '--z-modal-backdrop': Z_INDEX.modalBackdrop.toString(),
  '--z-modal-content': Z_INDEX.modalContent.toString(),
  '--z-toast': Z_INDEX.toast.toString(),
  '--z-debug': Z_INDEX.debug.toString(),
} as const;

// Utility function to get z-index with optional offset
export const getZIndex = (layer: keyof typeof Z_INDEX, offset: number = 0): number => {
  return Z_INDEX[layer] + offset;
};

// CSS class utilities
export const zIndexClasses = {
  dropdown: `z-[${Z_INDEX.dropdown}]`,
  tooltip: `z-[${Z_INDEX.tooltip}]`,
  sticky: `z-[${Z_INDEX.sticky}]`,
  overlay: `z-[${Z_INDEX.overlay}]`,
  modalBackdrop: `z-[${Z_INDEX.modalBackdrop}]`,
  modalContent: `z-[${Z_INDEX.modalContent}]`,
  toast: `z-[${Z_INDEX.toast}]`,
} as const;