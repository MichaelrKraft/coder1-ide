/**
 * IDE State Store (Zustand)
 * Centralized state management for IDE core functionality
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { 
  IDEFile, 
  IDESettings, 
  EditorState, 
  TerminalState, 
  LayoutState, 
  ModalState,
  LoadingState,
  ConnectionStatus,
  ProjectContext,
  DevStatus,
  ToastMessage
} from '@/types';

// ================================================================================
// IDE Store Interface
// ================================================================================

interface IDEStore {
  // Editor state
  editor: EditorState;
  
  // Terminal state
  terminal: TerminalState;
  
  // Layout state
  layout: LayoutState;
  
  // Modal state
  modals: ModalState;
  
  // Settings
  settings: IDESettings;
  
  // AI state
  aiState: {
    currentModel: 'claude-opus-4.1' | 'claude-sonnet-4' | 'claude-sonnet-3.7' | 'claude-3.5-haiku';
    tokenUsage: {
      input: number;
      output: number;
      total: number;
    };
    modelConfig: {
      temperature: number;
      maxTokens: number;
    };
  };
  
  // Loading states
  loading: LoadingState | null;
  
  // Connection status
  connections: ConnectionStatus;
  
  // Project context
  project: ProjectContext | null;
  
  // Development server status
  devServer: DevStatus;
  
  // Toast notifications
  toasts: ToastMessage[];
  
  // ================================================================================
  // Editor Actions
  // ================================================================================
  
  setActiveFile: (filePath: string | null) => void;
  openFile: (file: IDEFile) => void;
  closeFile: (filePath: string) => void;
  updateFileContent: (filePath: string, content: string) => void;
  markFileDirty: (filePath: string, isDirty: boolean) => void;
  setCursorPosition: (line: number, column: number) => void;
  setSelection: (start: { line: number; column: number }, end: { line: number; column: number }) => void;
  
  // ================================================================================
  // Terminal Actions
  // ================================================================================
  
  setTerminalConnected: (connected: boolean) => void;
  appendTerminalHistory: (output: string) => void;
  addTerminalCommand: (command: string) => void;
  setWorkingDirectory: (path: string) => void;
  clearTerminalHistory: () => void;
  
  // ================================================================================
  // Layout Actions
  // ================================================================================
  
  toggleExplorer: () => void;
  toggleTerminal: () => void;
  toggleOutput: () => void;
  togglePreview: () => void;
  setTerminalHeight: (height: number) => void;
  updatePanelSizes: (sizes: { left?: number; center?: number; right?: number }) => void;
  
  // ================================================================================
  // Modal Actions
  // ================================================================================
  
  openModal: (modal: keyof ModalState) => void;
  closeModal: (modal: keyof ModalState) => void;
  closeAllModals: () => void;
  
  // ================================================================================
  // Settings Actions
  // ================================================================================
  
  updateSettings: (settings: Partial<IDESettings>) => void;
  setFontSize: (size: number) => void;
  setTheme: (theme: IDESettings['theme']) => void;
  
  // ================================================================================
  // Loading Actions
  // ================================================================================
  
  setLoading: (state: LoadingState | null) => void;
  
  // ================================================================================
  // Connection Actions
  // ================================================================================
  
  setConnectionStatus: (type: keyof ConnectionStatus, status: boolean) => void;
  
  // ================================================================================
  // Project Actions
  // ================================================================================
  
  setProject: (project: ProjectContext) => void;
  updateProjectSettings: (settings: Partial<ProjectContext>) => void;
  
  // ================================================================================
  // Dev Server Actions
  // ================================================================================
  
  setDevServerStatus: (status: DevStatus['server'], port?: number, url?: string) => void;
  
  // ================================================================================
  // Toast Actions
  // ================================================================================
  
  addToast: (message: string, type?: ToastMessage['type'], duration?: number) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  // ================================================================================
  // AI Actions
  // ================================================================================
  
  setAIModel: (model: IDEStore['aiState']['currentModel']) => void;
  updateTokenUsage: (tokens: Partial<IDEStore['aiState']['tokenUsage']>) => void;
  resetTokenUsage: () => void;
  updateModelConfig: (config: Partial<IDEStore['aiState']['modelConfig']>) => void;
  
  // ================================================================================
  // Utility Actions
  // ================================================================================
  
  reset: () => void;
}

// ================================================================================
// Initial State
// ================================================================================

const initialState = {
  editor: {
    activeFile: null,
    openFiles: [],
    editorContent: '',
    cursorPosition: { line: 1, column: 1 },
    selection: null,
    markers: [],
  } as EditorState,
  
  terminal: {
    isConnected: false,
    history: '',
    commands: [],
    workingDirectory: '/',
    processId: null,
    lastCommand: null,
    lastOutput: null,
  } as TerminalState,
  
  layout: {
    showExplorer: true,
    showTerminal: true,
    showOutput: false,
    showPreview: true,
    terminalHeight: 52,
    panelSizes: {
      left: 15,
      center: 65,
      right: 20,
      terminal: 52,
    },
  } as LayoutState,
  
  modals: {
    about: false,
    keyboardShortcuts: false,
    settings: false,
    sessionSummary: false,
  } as ModalState,
  
  settings: {
    fontSize: 14,
    theme: 'dark' as const,
    tabSize: 2,
    wordWrap: true,
    lineNumbers: true,
    minimap: true,
    autoSave: true,
    autoFormat: true,
  } as IDESettings,
  
  aiState: {
    currentModel: 'claude-opus-4.1' as const,  // Default to Opus 4.1 (most capable)
    tokenUsage: {
      input: 0,
      output: 0,
      total: 0,
    },
    modelConfig: {
      temperature: 0.7,
      maxTokens: 4096,
    },
  },
  
  loading: null as LoadingState | null,
  
  connections: {
    terminal: false,
    backend: false,
    ai: false,
    supervision: false,
  } as ConnectionStatus,
  
  project: null as ProjectContext | null,
  
  devServer: {
    server: 'stopped' as const,
    port: null,
    url: null,
    lastRestart: null,
  } as DevStatus,
  
  toasts: [] as ToastMessage[],
};

// ================================================================================
// Store Implementation
// ================================================================================

export const useIDEStore = create<IDEStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // ================================================================================
        // Editor Actions
        // ================================================================================
        
        setActiveFile: (filePath) => 
          set((state) => ({
            editor: { ...state.editor, activeFile: filePath }
          }), false, 'setActiveFile'),
        
        openFile: (file) =>
          set((state) => {
            const exists = state.editor.openFiles.find(f => f.path === file.path);
            if (exists) {
              return {
                editor: { ...state.editor, activeFile: file.path }
              };
            }
            return {
              editor: {
                ...state.editor,
                openFiles: [...state.editor.openFiles, file],
                activeFile: file.path,
              }
            };
          }, false, 'openFile'),
        
        closeFile: (filePath) =>
          set((state) => ({
            editor: {
              ...state.editor,
              openFiles: state.editor.openFiles.filter(f => f.path !== filePath),
              activeFile: state.editor.activeFile === filePath 
                ? (state.editor.openFiles.length > 1 
                    ? state.editor.openFiles.find(f => f.path !== filePath)?.path || null
                    : null)
                : state.editor.activeFile
            }
          }), false, 'closeFile'),
        
        updateFileContent: (filePath, content) =>
          set((state) => ({
            editor: {
              ...state.editor,
              openFiles: state.editor.openFiles.map(f => 
                f.path === filePath ? { ...f, content, isDirty: true } : f
              ),
              editorContent: state.editor.activeFile === filePath ? content : state.editor.editorContent,
            }
          }), false, 'updateFileContent'),
        
        markFileDirty: (filePath, isDirty) =>
          set((state) => ({
            editor: {
              ...state.editor,
              openFiles: state.editor.openFiles.map(f => 
                f.path === filePath ? { ...f, isDirty } : f
              )
            }
          }), false, 'markFileDirty'),
        
        setCursorPosition: (line, column) =>
          set((state) => ({
            editor: { ...state.editor, cursorPosition: { line, column } }
          }), false, 'setCursorPosition'),
        
        setSelection: (start, end) =>
          set((state) => ({
            editor: { ...state.editor, selection: { start, end } }
          }), false, 'setSelection'),
        
        // ================================================================================
        // Terminal Actions
        // ================================================================================
        
        setTerminalConnected: (connected) =>
          set((state) => ({
            terminal: { ...state.terminal, isConnected: connected },
            connections: { ...state.connections, terminal: connected }
          }), false, 'setTerminalConnected'),
        
        appendTerminalHistory: (output) =>
          set((state) => {
            const newHistory = state.terminal.history + output;
            // Keep only last 10KB to prevent memory issues
            const trimmedHistory = newHistory.length > 10000 
              ? newHistory.slice(-10000) 
              : newHistory;
            return {
              terminal: { ...state.terminal, history: trimmedHistory, lastOutput: output }
            };
          }, false, 'appendTerminalHistory'),
        
        addTerminalCommand: (command) =>
          set((state) => {
            const newCommands = [...state.terminal.commands, command];
            // Keep only last 100 commands
            const trimmedCommands = newCommands.length > 100 
              ? newCommands.slice(-100) 
              : newCommands;
            return {
              terminal: { ...state.terminal, commands: trimmedCommands, lastCommand: command }
            };
          }, false, 'addTerminalCommand'),
        
        setWorkingDirectory: (path) =>
          set((state) => ({
            terminal: { ...state.terminal, workingDirectory: path }
          }), false, 'setWorkingDirectory'),
        
        clearTerminalHistory: () =>
          set((state) => ({
            terminal: { ...state.terminal, history: '', commands: [] }
          }), false, 'clearTerminalHistory'),
        
        // ================================================================================
        // Layout Actions
        // ================================================================================
        
        toggleExplorer: () =>
          set((state) => ({
            layout: { ...state.layout, showExplorer: !state.layout.showExplorer }
          }), false, 'toggleExplorer'),
        
        toggleTerminal: () =>
          set((state) => ({
            layout: { ...state.layout, showTerminal: !state.layout.showTerminal }
          }), false, 'toggleTerminal'),
        
        toggleOutput: () =>
          set((state) => ({
            layout: { ...state.layout, showOutput: !state.layout.showOutput }
          }), false, 'toggleOutput'),
        
        togglePreview: () =>
          set((state) => ({
            layout: { ...state.layout, showPreview: !state.layout.showPreview }
          }), false, 'togglePreview'),
        
        setTerminalHeight: (height) =>
          set((state) => ({
            layout: { 
              ...state.layout, 
              terminalHeight: Math.max(20, Math.min(80, height)),
              panelSizes: { ...state.layout.panelSizes, terminal: height }
            }
          }), false, 'setTerminalHeight'),
        
        updatePanelSizes: (sizes) =>
          set((state) => ({
            layout: {
              ...state.layout,
              panelSizes: { ...state.layout.panelSizes, ...sizes }
            }
          }), false, 'updatePanelSizes'),
        
        // ================================================================================
        // Modal Actions
        // ================================================================================
        
        openModal: (modal) =>
          set((state) => ({
            modals: { ...state.modals, [modal]: true }
          }), false, `openModal:${modal}`),
        
        closeModal: (modal) =>
          set((state) => ({
            modals: { ...state.modals, [modal]: false }
          }), false, `closeModal:${modal}`),
        
        closeAllModals: () =>
          set((state) => ({
            modals: { ...initialState.modals }
          }), false, 'closeAllModals'),
        
        // ================================================================================
        // Settings Actions
        // ================================================================================
        
        updateSettings: (settings) =>
          set((state) => ({
            settings: { ...state.settings, ...settings }
          }), false, 'updateSettings'),
        
        setFontSize: (size) =>
          set((state) => ({
            settings: { ...state.settings, fontSize: Math.max(8, Math.min(32, size)) }
          }), false, 'setFontSize'),
        
        setTheme: (theme) =>
          set((state) => ({
            settings: { ...state.settings, theme }
          }), false, 'setTheme'),
        
        // ================================================================================
        // Loading Actions
        // ================================================================================
        
        setLoading: (loadingState) =>
          set({ loading: loadingState }, false, `setLoading:${loadingState || 'idle'}`),
        
        // ================================================================================
        // Connection Actions
        // ================================================================================
        
        setConnectionStatus: (type, status) =>
          set((state) => ({
            connections: { ...state.connections, [type]: status }
          }), false, `setConnection:${type}:${status}`),
        
        // ================================================================================
        // Project Actions
        // ================================================================================
        
        setProject: (project) =>
          set({ project }, false, 'setProject'),
        
        updateProjectSettings: (settings) =>
          set((state) => ({
            project: state.project ? { ...state.project, ...settings } : null
          }), false, 'updateProjectSettings'),
        
        // ================================================================================
        // Dev Server Actions
        // ================================================================================
        
        setDevServerStatus: (server, port, url) =>
          set((state) => ({
            devServer: {
              ...state.devServer,
              server,
              port: port || state.devServer.port,
              url: url || state.devServer.url,
              lastRestart: server === 'running' ? new Date() : state.devServer.lastRestart,
            }
          }), false, `setDevServer:${server}`),
        
        // ================================================================================
        // Toast Actions
        // ================================================================================
        
        addToast: (message, type = 'info', duration = 3000) => {
          const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          set((state) => ({
            toasts: [...state.toasts, { id, message, type, duration }]
          }), false, `addToast:${type}`);
        },
        
        removeToast: (id) =>
          set((state) => ({
            toasts: state.toasts.filter(toast => toast.id !== id)
          }), false, 'removeToast'),
        
        clearToasts: () =>
          set({ toasts: [] }, false, 'clearToasts'),
        
        // ================================================================================
        // AI Actions
        // ================================================================================
        
        setAIModel: (model) => {
          set((state) => ({
            aiState: { ...state.aiState, currentModel: model }
          }), false, `setAIModel:${model}`);
          
          // Store preference in localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('preferredAIModel', model);
          }
        },
        
        updateTokenUsage: (tokens) =>
          set((state) => ({
            aiState: {
              ...state.aiState,
              tokenUsage: {
                input: tokens.input ?? state.aiState.tokenUsage.input,
                output: tokens.output ?? state.aiState.tokenUsage.output,
                total: tokens.input !== undefined || tokens.output !== undefined
                  ? (tokens.input ?? state.aiState.tokenUsage.input) + 
                    (tokens.output ?? state.aiState.tokenUsage.output)
                  : tokens.total ?? state.aiState.tokenUsage.total,
              }
            }
          }), false, 'updateTokenUsage'),
        
        resetTokenUsage: () =>
          set((state) => ({
            aiState: {
              ...state.aiState,
              tokenUsage: { input: 0, output: 0, total: 0 }
            }
          }), false, 'resetTokenUsage'),
        
        updateModelConfig: (config) =>
          set((state) => ({
            aiState: {
              ...state.aiState,
              modelConfig: { ...state.aiState.modelConfig, ...config }
            }
          }), false, 'updateModelConfig'),
        
        // ================================================================================
        // Utility Actions
        // ================================================================================
        
        reset: () => set(initialState, false, 'reset'),
      }),
      {
        name: 'coder1-ide-store',
        partialize: (state) => ({
          // Only persist certain parts of the state
          settings: state.settings,
          layout: {
            showExplorer: state.layout.showExplorer,
            showTerminal: state.layout.showTerminal,
            showOutput: state.layout.showOutput,
            showPreview: state.layout.showPreview,
            panelSizes: state.layout.panelSizes,
          },
          project: state.project,
          aiState: {
            currentModel: state.aiState.currentModel,
            modelConfig: state.aiState.modelConfig,
            // Don't persist token usage - reset on refresh
          },
        }),
      }
    ),
    {
      name: 'IDE Store'
    }
  )
);