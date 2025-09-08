/**
 * UI and Component Type Definitions
 * Types for UI state, component props, and user interactions
 */

import { ReactNode, MouseEventHandler, KeyboardEventHandler } from 'react';

// ================================================================================
// Base UI Types
// ================================================================================

export type ThemeMode = 'dark' | 'light' | 'tokyo-night';
export type ColorScheme = 'cyan' | 'purple' | 'orange' | 'green' | 'blue';
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ComponentVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error';

export interface BaseUIProps {
  className?: string;
  children?: ReactNode;
  id?: string;
  testId?: string;
}

// ================================================================================
// Modal and Dialog Types
// ================================================================================

export interface ModalProps extends BaseUIProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: ComponentSize;
  backdrop?: 'static' | 'blur' | 'transparent';
  closeOnEsc?: boolean;
  closeOnClickOutside?: boolean;
}

export interface DialogAction {
  id: string;
  label: string;
  variant?: ComponentVariant;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export interface ConfirmDialogProps extends ModalProps {
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'warning' | 'error' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
}

// ================================================================================
// Button and Interactive Types
// ================================================================================

export interface ButtonProps extends BaseUIProps {
  variant?: ComponentVariant;
  size?: ComponentSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  tooltip?: string;
}

export interface GlowButtonProps extends ButtonProps {
  glowColor?: ColorScheme;
  glowIntensity?: 'soft' | 'medium' | 'intense';
  animationDuration?: number;
}

export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: ReactNode;
  label: string; // for accessibility
}

// ================================================================================
// Form and Input Types
// ================================================================================

export interface InputProps extends BaseUIProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'url';
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  size?: ComponentSize;
  fullWidth?: boolean;
  autoFocus?: boolean;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface SelectProps extends Omit<InputProps, 'type' | 'onChange'> {
  options: SelectOption[];
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  onChange?: (value: string | string[]) => void;
}

// ================================================================================
// Panel and Layout Types
// ================================================================================

export interface PanelProps extends BaseUIProps {
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  headerActions?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  error?: string;
  empty?: boolean;
  emptyMessage?: string;
}

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  closable?: boolean;
  badge?: string | number;
}

export interface TabsProps extends BaseUIProps {
  items: TabItem[];
  activeTab?: string;
  variant?: 'default' | 'pills' | 'underlined';
  size?: ComponentSize;
  onChange?: (tabId: string) => void;
  onClose?: (tabId: string) => void;
}

// ================================================================================
// Status and Feedback Types
// ================================================================================

export interface ToastProps {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  dismissible?: boolean;
  actions?: ToastAction[];
  onClose?: () => void;
}

export interface ToastAction {
  label: string;
  onClick: () => void;
  style?: 'primary' | 'secondary';
}

export interface StatusIndicatorProps extends BaseUIProps {
  status: 'online' | 'offline' | 'loading' | 'error' | 'warning';
  label?: string;
  size?: ComponentSize;
  showLabel?: boolean;
  pulse?: boolean;
}

export interface ProgressBarProps extends BaseUIProps {
  value: number; // 0-100
  max?: number;
  showValue?: boolean;
  color?: ColorScheme;
  size?: ComponentSize;
  animated?: boolean;
  striped?: boolean;
}

export interface LoadingSpinnerProps extends BaseUIProps {
  size?: ComponentSize;
  color?: ColorScheme;
  message?: string;
}

// ================================================================================
// Menu and Navigation Types
// ================================================================================

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  children?: MenuItem[];
  onClick?: () => void;
}

export interface MenuProps extends BaseUIProps {
  items: MenuItem[];
  trigger: ReactNode;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  closeOnItemClick?: boolean;
  onItemClick?: (itemId: string) => void;
}

export interface BreadcrumbItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps extends BaseUIProps {
  items: BreadcrumbItem[];
  separator?: ReactNode;
  maxItems?: number;
}

// ================================================================================
// Data Display Types
// ================================================================================

export interface DataTableColumn<T = Record<string, unknown>> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => unknown);
  width?: number | string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: unknown, row: T) => ReactNode;
}

export interface DataTableProps<T = Record<string, unknown>> extends BaseUIProps {
  data: T[];
  columns: DataTableColumn<T>[];
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  selectable?: boolean;
  selectedRows?: string[];
  onRowSelect?: (rowIds: string[]) => void;
  onSort?: (columnId: string, direction: 'asc' | 'desc') => void;
  onFilter?: (columnId: string, value: string) => void;
}

export interface TreeNode {
  id: string;
  label: string;
  icon?: ReactNode;
  children?: TreeNode[];
  expanded?: boolean;
  selected?: boolean;
  disabled?: boolean;
  data?: Record<string, unknown>;
}

export interface TreeViewProps extends BaseUIProps {
  nodes: TreeNode[];
  selectable?: boolean;
  multiSelect?: boolean;
  expandable?: boolean;
  defaultExpanded?: string[];
  selectedNodes?: string[];
  onSelect?: (nodeIds: string[]) => void;
  onExpand?: (nodeId: string, expanded: boolean) => void;
  renderNode?: (node: TreeNode) => ReactNode;
}

// ================================================================================
// Discovery and Command Palette Types
// ================================================================================

export interface Command {
  id: string;
  name: string;
  description: string;
  action: string | (() => void);
  category?: string;
  keywords?: string[];
  shortcut?: string;
  icon?: ReactNode;
}

export interface CommandPaletteProps extends BaseUIProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
  placeholder?: string;
  maxResults?: number;
  onExecute?: (command: Command) => void;
}

export interface DiscoverPanelProps extends BaseUIProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  commands: Command[];
  customCommands: Command[];
  onAddCommand: (command: Command) => void;
  onExecuteCommand: (command: Command) => void;
}

// ================================================================================
// Animation and Transition Types
// ================================================================================

export interface AnimationConfig {
  duration?: number;
  delay?: number;
  easing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | string;
  fillMode?: 'forwards' | 'backwards' | 'both' | 'none';
}

export interface TransitionProps {
  show: boolean;
  appear?: boolean;
  enter?: string;
  enterFrom?: string;
  enterTo?: string;
  leave?: string;
  leaveFrom?: string;
  leaveTo?: string;
  duration?: number;
  children: ReactNode;
}

// ================================================================================
// Responsive and Accessibility Types
// ================================================================================

export interface ResponsiveValue<T> {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}

export interface AccessibilityProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-hidden'?: boolean;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  role?: string;
  tabIndex?: number;
}

// ================================================================================
// Event and Handler Types
// ================================================================================

export interface KeyboardShortcutEvent {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

export interface DragDropEvent {
  type: 'drag' | 'drop';
  sourceId: string;
  targetId: string;
  data: Record<string, unknown>;
  position?: 'before' | 'after' | 'inside';
}

export interface ResizeEvent {
  width: number;
  height: number;
  element: HTMLElement;
}

// ================================================================================
// Context and Provider Types
// ================================================================================

export interface UIContextValue {
  theme: ThemeMode;
  colorScheme: ColorScheme;
  setTheme: (theme: ThemeMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  
  // Toast management
  toasts: ToastProps[];
  addToast: (toast: Omit<ToastProps, 'id'>) => void;
  removeToast: (id: string) => void;
  
  // Modal management
  modals: Record<string, boolean>;
  openModal: (id: string) => void;
  closeModal: (id: string) => void;
  
  // Loading states
  loading: Record<string, boolean>;
  setLoading: (key: string, loading: boolean) => void;
}