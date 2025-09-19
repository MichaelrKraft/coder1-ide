// Design System Exports
// Centralized export for all design system components and utilities

// Design Tokens
export { default as designTokens, getColor, getSpacing, getShadow } from './tokens';
export type { DesignTokens } from './tokens';

// Hooks
export {
  useDesignTokens,
  useColors,
  useTypography,
  useComponentStyles,
  useAnimations,
  createStyledProps,
  cssVar,
  generateThemeClasses
} from './useDesignTokens';

// Components
export { default as Button, ButtonGroup, ButtonToolbar, IconButton } from './Button';
export type { ButtonProps } from './Button';

export { default as CommandPalette } from './CommandPalette';
export type { CommandPaletteProps, Command, CommandGroup } from './CommandPalette';

export { default as StatusBar } from './StatusBar';
export type { StatusBarProps, StatusItem, StatusSection } from './StatusBar';

export { 
  default as KeyboardProvider,
  useKeyboardShortcuts,
  useKeyboardShortcut,
  useKeyboardShortcutGroup,
  createDefaultShortcuts,
  formatKeyCombo
} from './KeyboardShortcuts';
export type { KeyboardShortcut, ShortcutGroup } from './KeyboardShortcuts';

export { default as KeyboardShortcutsPanel } from './KeyboardShortcutsPanel';
export type { KeyboardShortcutsPanelProps } from './KeyboardShortcutsPanel';

export { default as PerformanceDashboard } from './PerformanceDashboard';
export type { 
  PerformanceDashboardProps, 
  PerformanceMetric, 
  PerformanceAlert, 
  DashboardConfig 
} from './PerformanceDashboard';

// CSS is imported automatically when components are used

// Re-export common React types for convenience
export type {
  ComponentProps,
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  ElementType,
  ReactNode,
  ReactElement,
  ForwardRefExoticComponent,
  RefAttributes
} from 'react';