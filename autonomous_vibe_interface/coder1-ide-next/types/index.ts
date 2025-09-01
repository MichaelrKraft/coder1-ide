/**
 * Type Definitions Index
 * Centralized export for all Coder1 v2.0 IDE types
 */

// Core IDE types
export * from './ide';

// Session and AI types
export * from './session';

// UI and component types  
export * from './ui';

// Re-export commonly used React types for convenience
export type { 
  ReactNode, 
  ReactElement, 
  ComponentProps, 
  MouseEvent, 
  KeyboardEvent,
  ChangeEvent,
  FormEvent
} from 'react';