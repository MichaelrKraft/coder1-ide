/**
 * UI State Store (Zustand)
 * Centralized state management for UI interactions, modals, and visual state
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { 
  ThemeMode, 
  ColorScheme, 
  ToastProps,
  Command
} from '@/types';

// ================================================================================
// UI Store Interface
// ================================================================================

interface UIStore {
  // Theme and appearance
  theme: ThemeMode;
  colorScheme: ColorScheme;
  
  // Modal management
  modals: Record<string, boolean>;
  
  // Toast notifications
  toasts: ToastProps[];
  
  // Loading states for various operations
  loading: Record<string, boolean>;
  
  // Discover panel
  discoverPanel: {
    isOpen: boolean;
    commandInput: string;
    customCommands: Command[];
    showAddForm: boolean;
    newCommand: {
      name: string;
      description: string;
      action: string;
    };
  };
  
  // Command palette
  commandPalette: {
    isOpen: boolean;
    searchQuery: string;
    selectedIndex: number;
    filteredCommands: Command[];
  };
  
  // Sidebar and panels
  sidebar: {
    collapsed: boolean;
    width: number;
    activeTab: 'explorer' | 'search' | 'git' | 'extensions';
  };
  
  // Editor UI state
  editor: {
    showMinimap: boolean;
    showLineNumbers: boolean;
    wordWrap: boolean;
    fontSize: number;
    fontFamily: string;
    tabSize: number;
  };
  
  // Terminal UI state
  terminal: {
    fontSize: number;
    fontFamily: string;
    showScrollbar: boolean;
    cursorStyle: 'block' | 'line' | 'underline';
  };
  
  // Recent files and quick access
  recentFiles: string[];
  pinnedFiles: string[];
  
  // Keyboard shortcuts
  shortcuts: Record<string, boolean>; // Track which shortcuts are active
  
  // ================================================================================
  // Theme Actions
  // ================================================================================
  
  setTheme: (theme: ThemeMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleTheme: () => void;
  
  // ================================================================================
  // Modal Actions
  // ================================================================================
  
  openModal: (id: string) => void;
  closeModal: (id: string) => void;
  toggleModal: (id: string) => void;
  closeAllModals: () => void;
  isModalOpen: (id: string) => boolean;
  
  // ================================================================================
  // Toast Actions
  // ================================================================================
  
  addToast: (toast: Omit<ToastProps, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  updateToast: (id: string, updates: Partial<ToastProps>) => void;
  
  // ================================================================================
  // Loading Actions
  // ================================================================================
  
  setLoading: (key: string, loading: boolean) => void;
  isLoading: (key: string) => boolean;
  clearAllLoading: () => void;
  
  // ================================================================================
  // Discover Panel Actions
  // ================================================================================
  
  toggleDiscoverPanel: () => void;
  setDiscoverPanelOpen: (open: boolean) => void;
  setCommandInput: (input: string) => void;
  addCustomCommand: (command: Command) => void;
  removeCustomCommand: (id: string) => void;
  toggleAddCommandForm: () => void;
  updateNewCommand: (field: keyof UIStore['discoverPanel']['newCommand'], value: string) => void;
  clearNewCommand: () => void;
  
  // ================================================================================
  // Command Palette Actions
  // ================================================================================
  
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  setSearchQuery: (query: string) => void;
  setSelectedIndex: (index: number) => void;
  updateFilteredCommands: (commands: Command[]) => void;
  
  // ================================================================================
  // Sidebar Actions
  // ================================================================================
  
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setActiveTab: (tab: UIStore['sidebar']['activeTab']) => void;
  
  // ================================================================================
  // Editor UI Actions
  // ================================================================================
  
  toggleMinimap: () => void;
  toggleLineNumbers: () => void;
  toggleWordWrap: () => void;
  setEditorFontSize: (size: number) => void;
  setEditorFontFamily: (family: string) => void;
  setTabSize: (size: number) => void;
  
  // ================================================================================
  // Terminal UI Actions
  // ================================================================================
  
  setTerminalFontSize: (size: number) => void;
  setTerminalFontFamily: (family: string) => void;
  toggleTerminalScrollbar: () => void;
  setTerminalCursorStyle: (style: UIStore['terminal']['cursorStyle']) => void;
  
  // ================================================================================
  // File Management Actions
  // ================================================================================
  
  addRecentFile: (filepath: string) => void;
  removeRecentFile: (filepath: string) => void;
  clearRecentFiles: () => void;
  pinFile: (filepath: string) => void;
  unpinFile: (filepath: string) => void;
  
  // ================================================================================
  // Keyboard Shortcut Actions
  // ================================================================================
  
  setShortcutActive: (shortcut: string, active: boolean) => void;
  isShortcutActive: (shortcut: string) => boolean;
  
  // ================================================================================
  // Utility Actions
  // ================================================================================
  
  reset: () => void;
  exportSettings: () => Record<string, any>;
  importSettings: (settings: Record<string, any>) => void;
}

// ================================================================================
// Initial State
// ================================================================================

const initialState = {
  theme: 'dark' as ThemeMode,
  colorScheme: 'cyan' as ColorScheme,
  
  modals: {} as Record<string, boolean>,
  
  toasts: [] as ToastProps[],
  
  loading: {} as Record<string, boolean>,
  
  discoverPanel: {
    isOpen: false,
    commandInput: '',
    customCommands: [] as Command[],
    showAddForm: false,
    newCommand: {
      name: '',
      description: '',
      action: '',
    },
  },
  
  commandPalette: {
    isOpen: false,
    searchQuery: '',
    selectedIndex: 0,
    filteredCommands: [] as Command[],
  },
  
  sidebar: {
    collapsed: false,
    width: 240,
    activeTab: 'explorer' as const,
  },
  
  editor: {
    showMinimap: true,
    showLineNumbers: true,
    wordWrap: true,
    fontSize: 14,
    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
    tabSize: 2,
  },
  
  terminal: {
    fontSize: 14,
    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
    showScrollbar: true,
    cursorStyle: 'block' as const,
  },
  
  recentFiles: [] as string[],
  pinnedFiles: [] as string[],
  
  shortcuts: {} as Record<string, boolean>,
};

// ================================================================================
// Utility Functions
// ================================================================================

const generateToastId = () => `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ================================================================================
// Store Implementation
// ================================================================================

export const useUIStore = create<UIStore>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // ================================================================================
      // Theme Actions
      // ================================================================================
      
      setTheme: (theme) => 
        set({ theme }, false, `setTheme:${theme}`),
      
      setColorScheme: (colorScheme) => 
        set({ colorScheme }, false, `setColorScheme:${colorScheme}`),
      
      toggleTheme: () => {
        const { theme } = get();
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        set({ theme: newTheme }, false, `toggleTheme:${newTheme}`);
      },
      
      // ================================================================================
      // Modal Actions
      // ================================================================================
      
      openModal: (id) =>
        set((state) => ({
          modals: { ...state.modals, [id]: true }
        }), false, `openModal:${id}`),
      
      closeModal: (id) =>
        set((state) => ({
          modals: { ...state.modals, [id]: false }
        }), false, `closeModal:${id}`),
      
      toggleModal: (id) =>
        set((state) => ({
          modals: { ...state.modals, [id]: !state.modals[id] }
        }), false, `toggleModal:${id}`),
      
      closeAllModals: () =>
        set({ modals: {} }, false, 'closeAllModals'),
      
      isModalOpen: (id) => Boolean(get().modals[id]),
      
      // ================================================================================
      // Toast Actions
      // ================================================================================
      
      addToast: (toast) => {
        const id = generateToastId();
        const newToast = { ...toast, id };
        
        set((state) => ({
          toasts: [...state.toasts, newToast]
        }), false, `addToast:${toast.type || 'info'}`);
        
        // Auto-remove toast after duration
        if (toast.duration !== 0) {
          setTimeout(() => {
            get().removeToast(id);
          }, toast.duration || 3000);
        }
      },
      
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter(toast => toast.id !== id)
        }), false, 'removeToast'),
      
      clearToasts: () =>
        set({ toasts: [] }, false, 'clearToasts'),
      
      updateToast: (id, updates) =>
        set((state) => ({
          toasts: state.toasts.map(toast =>
            toast.id === id ? { ...toast, ...updates } : toast
          )
        }), false, 'updateToast'),
      
      // ================================================================================
      // Loading Actions
      // ================================================================================
      
      setLoading: (key, loading) =>
        set((state) => ({
          loading: { ...state.loading, [key]: loading }
        }), false, `setLoading:${key}:${loading}`),
      
      isLoading: (key) => Boolean(get().loading[key]),
      
      clearAllLoading: () =>
        set({ loading: {} }, false, 'clearAllLoading'),
      
      // ================================================================================
      // Discover Panel Actions
      // ================================================================================
      
      toggleDiscoverPanel: () =>
        set((state) => ({
          discoverPanel: { ...state.discoverPanel, isOpen: !state.discoverPanel.isOpen }
        }), false, 'toggleDiscoverPanel'),
      
      setDiscoverPanelOpen: (open) =>
        set((state) => ({
          discoverPanel: { ...state.discoverPanel, isOpen: open }
        }), false, `setDiscoverPanelOpen:${open}`),
      
      setCommandInput: (input) =>
        set((state) => ({
          discoverPanel: { ...state.discoverPanel, commandInput: input }
        }), false, 'setCommandInput'),
      
      addCustomCommand: (command) =>
        set((state) => ({
          discoverPanel: {
            ...state.discoverPanel,
            customCommands: [...state.discoverPanel.customCommands, command]
          }
        }), false, 'addCustomCommand'),
      
      removeCustomCommand: (id) =>
        set((state) => ({
          discoverPanel: {
            ...state.discoverPanel,
            customCommands: state.discoverPanel.customCommands.filter(cmd => cmd.id !== id)
          }
        }), false, 'removeCustomCommand'),
      
      toggleAddCommandForm: () =>
        set((state) => ({
          discoverPanel: {
            ...state.discoverPanel,
            showAddForm: !state.discoverPanel.showAddForm,
            newCommand: state.discoverPanel.showAddForm 
              ? { name: '', description: '', action: '' } 
              : state.discoverPanel.newCommand
          }
        }), false, 'toggleAddCommandForm'),
      
      updateNewCommand: (field, value) =>
        set((state) => ({
          discoverPanel: {
            ...state.discoverPanel,
            newCommand: { ...state.discoverPanel.newCommand, [field]: value }
          }
        }), false, `updateNewCommand:${field}`),
      
      clearNewCommand: () =>
        set((state) => ({
          discoverPanel: {
            ...state.discoverPanel,
            newCommand: { name: '', description: '', action: '' }
          }
        }), false, 'clearNewCommand'),
      
      // ================================================================================
      // Command Palette Actions
      // ================================================================================
      
      openCommandPalette: () =>
        set((state) => ({
          commandPalette: { ...state.commandPalette, isOpen: true, selectedIndex: 0 }
        }), false, 'openCommandPalette'),
      
      closeCommandPalette: () =>
        set((state) => ({
          commandPalette: { ...state.commandPalette, isOpen: false, searchQuery: '' }
        }), false, 'closeCommandPalette'),
      
      setSearchQuery: (query) =>
        set((state) => ({
          commandPalette: { ...state.commandPalette, searchQuery: query, selectedIndex: 0 }
        }), false, 'setSearchQuery'),
      
      setSelectedIndex: (index) =>
        set((state) => ({
          commandPalette: { ...state.commandPalette, selectedIndex: index }
        }), false, 'setSelectedIndex'),
      
      updateFilteredCommands: (commands) =>
        set((state) => ({
          commandPalette: { ...state.commandPalette, filteredCommands: commands }
        }), false, 'updateFilteredCommands'),
      
      // ================================================================================
      // Sidebar Actions
      // ================================================================================
      
      toggleSidebar: () =>
        set((state) => ({
          sidebar: { ...state.sidebar, collapsed: !state.sidebar.collapsed }
        }), false, 'toggleSidebar'),
      
      setSidebarWidth: (width) =>
        set((state) => ({
          sidebar: { ...state.sidebar, width: Math.max(200, Math.min(500, width)) }
        }), false, 'setSidebarWidth'),
      
      setActiveTab: (tab) =>
        set((state) => ({
          sidebar: { ...state.sidebar, activeTab: tab }
        }), false, `setActiveTab:${tab}`),
      
      // ================================================================================
      // Editor UI Actions
      // ================================================================================
      
      toggleMinimap: () =>
        set((state) => ({
          editor: { ...state.editor, showMinimap: !state.editor.showMinimap }
        }), false, 'toggleMinimap'),
      
      toggleLineNumbers: () =>
        set((state) => ({
          editor: { ...state.editor, showLineNumbers: !state.editor.showLineNumbers }
        }), false, 'toggleLineNumbers'),
      
      toggleWordWrap: () =>
        set((state) => ({
          editor: { ...state.editor, wordWrap: !state.editor.wordWrap }
        }), false, 'toggleWordWrap'),
      
      setEditorFontSize: (size) =>
        set((state) => ({
          editor: { ...state.editor, fontSize: Math.max(8, Math.min(32, size)) }
        }), false, 'setEditorFontSize'),
      
      setEditorFontFamily: (family) =>
        set((state) => ({
          editor: { ...state.editor, fontFamily: family }
        }), false, 'setEditorFontFamily'),
      
      setTabSize: (size) =>
        set((state) => ({
          editor: { ...state.editor, tabSize: Math.max(1, Math.min(8, size)) }
        }), false, 'setTabSize'),
      
      // ================================================================================
      // Terminal UI Actions
      // ================================================================================
      
      setTerminalFontSize: (size) =>
        set((state) => ({
          terminal: { ...state.terminal, fontSize: Math.max(8, Math.min(32, size)) }
        }), false, 'setTerminalFontSize'),
      
      setTerminalFontFamily: (family) =>
        set((state) => ({
          terminal: { ...state.terminal, fontFamily: family }
        }), false, 'setTerminalFontFamily'),
      
      toggleTerminalScrollbar: () =>
        set((state) => ({
          terminal: { ...state.terminal, showScrollbar: !state.terminal.showScrollbar }
        }), false, 'toggleTerminalScrollbar'),
      
      setTerminalCursorStyle: (style) =>
        set((state) => ({
          terminal: { ...state.terminal, cursorStyle: style }
        }), false, `setTerminalCursorStyle:${style}`),
      
      // ================================================================================
      // File Management Actions
      // ================================================================================
      
      addRecentFile: (filepath) =>
        set((state) => {
          const filtered = state.recentFiles.filter(f => f !== filepath);
          return {
            recentFiles: [filepath, ...filtered].slice(0, 20) // Keep last 20
          };
        }, false, 'addRecentFile'),
      
      removeRecentFile: (filepath) =>
        set((state) => ({
          recentFiles: state.recentFiles.filter(f => f !== filepath)
        }), false, 'removeRecentFile'),
      
      clearRecentFiles: () =>
        set({ recentFiles: [] }, false, 'clearRecentFiles'),
      
      pinFile: (filepath) =>
        set((state) => {
          if (state.pinnedFiles.includes(filepath)) return state;
          return {
            pinnedFiles: [...state.pinnedFiles, filepath]
          };
        }, false, 'pinFile'),
      
      unpinFile: (filepath) =>
        set((state) => ({
          pinnedFiles: state.pinnedFiles.filter(f => f !== filepath)
        }), false, 'unpinFile'),
      
      // ================================================================================
      // Keyboard Shortcut Actions
      // ================================================================================
      
      setShortcutActive: (shortcut, active) =>
        set((state) => ({
          shortcuts: { ...state.shortcuts, [shortcut]: active }
        }), false, `setShortcutActive:${shortcut}:${active}`),
      
      isShortcutActive: (shortcut) => Boolean(get().shortcuts[shortcut]),
      
      // ================================================================================
      // Utility Actions
      // ================================================================================
      
      reset: () => set(initialState, false, 'reset'),
      
      exportSettings: () => {
        const { theme, colorScheme, editor, terminal, sidebar } = get();
        return {
          theme,
          colorScheme,
          editor,
          terminal,
          sidebar,
        };
      },
      
      importSettings: (settings) => {
        set((state) => ({
          ...state,
          ...settings
        }), false, 'importSettings');
      },
    }),
    {
      name: 'UI Store'
    }
  )
);