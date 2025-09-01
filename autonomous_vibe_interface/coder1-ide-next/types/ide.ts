/**
 * Core IDE Type Definitions
 * Centralized types for the Coder1 v2.0 IDE system
 */

// ================================================================================
// Core IDE Types
// ================================================================================

export interface IDEFile {
  id: string;
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  isOpen: boolean;
  language: string;
  type: FileType;
  lastModified: Date;
}

export type FileType = 'javascript' | 'typescript' | 'json' | 'css' | 'html' | 'markdown' | 'text' | 'unknown';

export interface IDESettings {
  fontSize: number;
  theme: 'dark' | 'light' | 'tokyo-night';
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
  autoSave: boolean;
  autoFormat: boolean;
}

export interface PanelSizes {
  left: number;    // Percentage (15)
  center: number;  // Percentage (65) 
  right: number;   // Percentage (20)
  terminal: number; // Percentage of center panel (52)
}

export interface KeyboardShortcut {
  id: string;
  keys: string;
  description: string;
  action: string;
  category: 'file' | 'edit' | 'view' | 'run' | 'help';
}

// ================================================================================
// Editor Types
// ================================================================================

export interface EditorState {
  activeFile: string | null;
  openFiles: IDEFile[];
  editorContent: string;
  cursorPosition: {
    line: number;
    column: number;
  };
  selection: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  } | null;
  markers: EditorMarker[];
}

export interface EditorMarker {
  id: string;
  line: number;
  column: number;
  type: 'error' | 'warning' | 'info';
  message: string;
  source: string;
}

// ================================================================================
// Terminal Types
// ================================================================================

export interface TerminalState {
  isConnected: boolean;
  history: string;
  commands: string[];
  workingDirectory: string;
  processId: number | null;
  lastCommand: string | null;
  lastOutput: string | null;
}

export interface TerminalCommand {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  timestamp: Date;
  duration: number;
}

// ================================================================================
// Layout Types
// ================================================================================

export interface LayoutState {
  showExplorer: boolean;
  showTerminal: boolean;
  showOutput: boolean;
  showPreview: boolean;
  terminalHeight: number;
  panelSizes: PanelSizes;
}

export interface ModalState {
  about: boolean;
  keyboardShortcuts: boolean;
  settings: boolean;
  sessionSummary: boolean;
}

// ================================================================================
// Menu and Action Types
// ================================================================================

export interface MenuAction {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  separator?: boolean;
  disabled?: boolean;
}

export interface MenuConfig {
  [menuName: string]: MenuAction[];
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

// ================================================================================
// Loading and Status Types
// ================================================================================

export type LoadingState = 
  | 'idle' 
  | 'checkpoint' 
  | 'timeline' 
  | 'export' 
  | 'session' 
  | 'docs';

export interface ConnectionStatus {
  terminal: boolean;
  backend: boolean;
  ai: boolean;
  supervision: boolean;
}

// ================================================================================
// Project and Context Types
// ================================================================================

export interface ProjectContext {
  name: string;
  path: string;
  type: 'react' | 'next' | 'vue' | 'angular' | 'vanilla' | 'unknown';
  package: any; // package.json contents
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
}

export interface DevStatus {
  server: 'running' | 'stopped' | 'error';
  port: number | null;
  url: string | null;
  lastRestart: Date | null;
}

// ================================================================================
// Component Props Types
// ================================================================================

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface IDEComponentProps extends BaseComponentProps {
  isLoading?: boolean;
  disabled?: boolean;
  tooltip?: string;
}

// ================================================================================
// Hook Return Types
// ================================================================================

export interface UseKeyboardShortcutsReturn {
  shortcuts: KeyboardShortcut[];
  addShortcut: (shortcut: KeyboardShortcut) => void;
  removeShortcut: (id: string) => void;
  executeShortcut: (keys: string) => boolean;
}

export interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: T) => void;
  clearValue: () => void;
}

export interface UseAsyncOperationReturn<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
}