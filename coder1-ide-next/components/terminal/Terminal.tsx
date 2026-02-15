'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Dynamic imports for xterm to prevent SSR issues
let XTerm: any;
let FitAddon: any;

if (typeof window !== 'undefined') {
  const xtermModule = require('@xterm/xterm');
  const fitModule = require('@xterm/addon-fit');
  XTerm = xtermModule.Terminal;
  FitAddon = fitModule.FitAddon;
  require('@xterm/xterm/css/xterm.css');
}
import './Terminal.css'; // Re-enabled - critical for xterm viewport fixes
import { Zap, StopCircle, Brain, Eye, Code2, Mic, MicOff, Speaker, ChevronDown, Plus, Users } from '@/lib/icons';
import { Edit3, GitBranch, X, Stethoscope, Boxes, Loader2 } from 'lucide-react';
import { useMCPOverlay, useMCPServers } from '@/hooks/useMCPManager';
import MCPOverlay from '@/components/MCPManager/MCPOverlay';
import SandboxPanel from '@/components/sandbox/SandboxPanel';
import { useModelStore } from '@/stores/useModelStore';
import TerminalSettings, { TerminalSettingsState } from './TerminalSettings';
import { glows, spacing } from '@/lib/design-tokens';
import { getSocket } from '@/lib/socket';
import ErrorDoctor from './ErrorDoctor';
import { soundAlertService, SoundPreset } from '@/lib/sound-alert-service';
import { consoleCaptureService, CapturedConsoleError } from '@/lib/console-capture-service';
import { logger } from '@/lib/logger';
import { useEnhancedSupervision } from '@/contexts/EnhancedSupervisionContext';
import SupervisionConfigModal from '@/components/supervision/SupervisionConfigModal';
import { features } from '@/lib/feature-flags';
import { useUIStore } from '@/stores/useUIStore';
import { useIDEStore } from '@/stores/useIDEStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTerminalStore } from '@/stores/useTerminalStore';
import { parseClaudeTokenUsage } from '@/lib/claude-token-parser';
import { filterThinkingAnimations, extractClaudeCommands } from '@/lib/checkpoint-utils';
import { getCompanionClient } from '@/lib/companion-client';
import { terminalCommandHandler } from '@/lib/terminal-commands';
import { debounce } from '@/lib/debounce';
import { RateLimitDetector } from '@/lib/rate-limit-detector';
import { TerminalModeManager } from '@/lib/terminal-mode-manager';
import { devLog, devWarn, perfLog } from '@/lib/dev-logger'; // Performance: disable logs in production
// import EnhancedStatusline from '@/components/statusline/EnhancedStatusline'; // Temporarily disabled for debugging
import StagedComposer from './StagedComposer';
import SessionMetricsBar from './SessionMetricsBar';
import { useAutoCheckpoint } from '@/lib/hooks/useAutoCheckpoint';

// Time Capsule: Dynamic import to avoid bundle impact when feature is disabled
const TimeCapsulePrompt = features().timeCapsules
  ? dynamic(() => import('@/components/time-capsules/TimeCapsulePrompt'), { ssr: false })
  : null;

// Defensive filtering for status lines - Layer 3 protection
const cleanStatusLines = (data: string): string => {
  if (!data) return data;
  
  // 🔒 CRITICAL FIX (Oct 28, 2025): DO NOT strip ANSI codes from history!
  // Claude Code's beautiful UI depends on ANSI escape sequences for colors and formatting
  // Stripping them removes 99% of the content, leaving only plain text
  // We ONLY need to remove focus codes (\x1b[I and \x1b[O) which are handled separately
  
  let cleaned = data;
  
  // Remove bracketed paste mode codes (these are safe to remove)
  cleaned = cleaned.replace(/\[200~/g, '');
  cleaned = cleaned.replace(/\[201~/g, '');
  
  // REMOVED: ANSI stripping that was destroying Claude's output
  // The focus codes are now handled in the terminal:history handler
  
  return cleaned;
};

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface TerminalProps {
  onAgentsSpawn?: () => void;
  onTerminalClick?: () => void;
  onClaudeTyped?: () => void;
  onTerminalData?: (data: string) => void;
  onTerminalCommand?: (command: string) => void;
  onTerminalReady?: (sessionId: string | null, ready: boolean) => void;
  onComposerVisibilityChange?: (visible: boolean) => void;
  onClaudeActiveChange?: (active: boolean) => void; // 🔧 FIX (Feb 1, 2025): Notify parent when Claude starts/stops responding
  sandboxMode?: boolean;
  sandboxSession?: {
    id: string;
    name: string;
    checkpointData: any;
    terminalHistory?: string;
    createdAt: Date;
  }; // Session data from checkpoint
  agentMode?: boolean; // New prop to indicate agent terminal
  agentSession?: {
    id: string;
    name: string;
    role: string;
    teamId: string;
    terminalHistory?: string;
    status: string;
    progress: number;
    currentTask: string;
    createdAt: Date;
  }; // Agent session data
  isVisible?: boolean; // Whether this terminal is currently visible
  restoredHistory?: string | null; // Terminal history from checkpoint restore
  restoredSessionId?: string | null; // Terminal session ID to reconnect to
}

/**
 * Terminal Component
 * 
 * PRESERVED FROM ORIGINAL:
 * - AI Team button position: right: 120px from edge
 * - Terminal header height: 40px
 * - Orange glow on button hover
 * - Exact padding and spacing
 * 
 * DO NOT MODIFY button positioning without checking original
 */
export default function Terminal({ onAgentsSpawn, onTerminalClick, onClaudeTyped, onTerminalData, onTerminalCommand, onTerminalReady, onComposerVisibilityChange, onClaudeActiveChange, sandboxMode = false, sandboxSession, agentMode = false, agentSession, isVisible = true, restoredHistory = null, restoredSessionId = null }: TerminalProps) {
  // REMOVED: // REMOVED: console.log('🖥️ Terminal component rendering...');
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdForVoiceRef = useRef<string | null>(null); // Move this up here
  const sessionCreatedRef = useRef(false); // Track if session was already created
  const onDataDisposableRef = useRef<any>(null); // Store onData disposable
  const reconnectInProgressRef = useRef(false); // Prevent duplicate auto-reconnects
  const connectionInProgressRef = useRef(false); // Prevent concurrent connections
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Watchdog timer for connection
  const pasteHandlerRef = useRef<((e: ClipboardEvent) => Promise<void>) | null>(null); // Store paste handler for cleanup
  const isSelectingRef = useRef(false); // Track text selection state
  const scrollIntervalRef = useRef<number | null>(null); // Track auto-scroll animation frame
  const mouseYRef = useRef<number>(0); // Track current mouse Y position globally
  const selectionChangeDisposableRef = useRef<any>(null); // Store xterm onSelectionChange disposable
  const selectionHandlersRef = useRef<{
    mousedown: ((e: MouseEvent) => void) | null;
    mouseup: ((e: MouseEvent) => void) | null;
    mousemove: ((e: MouseEvent) => void) | null;
  }>({ mousedown: null, mouseup: null, mousemove: null }); // Store selection handlers for cleanup
  const initialLoadComplete = useRef(false); // Track if initial header has been displayed (prevents auto-scroll on first load)
  const [isConnected, setIsConnected] = useState(false);
  const [agentsRunning, setAgentsRunning] = useState(false);
  const activeTeam = useSessionStore((state) => state.activeTeam);
  const [voiceListening, setVoiceListening] = useState(false);
  
  // Emergency stop state (Nov 26, 2025)
  const [activeAgentCount, setActiveAgentCount] = useState(0);
  const [isStoppingAgents, setIsStoppingAgents] = useState(false);
  const [restorationState, setRestorationState] = useState<'hidden' | 'reconnecting' | 'restoring'>('hidden'); // Unified UI state
  const [companionConnected, setCompanionConnected] = useState(false);
  const companionClientRef = useRef<any>(null);
  const currentCommandBuffer = useRef<string>('');
  const lineBufferRef = useRef<string>(''); // Sync ref for currentLineBuffer state (avoids React timing issues)
  
  // GLM Integration: Rate limit detection and mode management
  // ⚡ CRITICAL PERFORMANCE FIX (Feb 2, 2025): Initialize ONCE, not on every render
  // Previous: new RateLimitDetector() ran on EVERY render, creating new instances
  // Result: Progressive lag as Terminal re-renders accumulate overhead
  const rateLimitDetectorRef = useRef<RateLimitDetector | null>(null);
  if (!rateLimitDetectorRef.current) {
    rateLimitDetectorRef.current = new RateLimitDetector();
  }
  
  const modeManagerRef = useRef<TerminalModeManager | null>(null);
  if (!modeManagerRef.current) {
    modeManagerRef.current = new TerminalModeManager();
  }
  
  // Claude Code Session Token Monitoring (Nov 24, 2025)
  const sessionUsagePollerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 🎯 CRITICAL FIX (Oct 28, 2025): Store Socket.IO handler refs for proper cleanup
  // Without this, socket.off() removes ALL listeners including ones from new component instances
  const socketHandlersRef = useRef<{
    terminalHistory: ((data: any) => void) | null;
    terminalData: ((data: any) => void) | null;
    terminalCommand: ((data: any) => void) | null;
    terminalCreated: ((data: any) => void) | null;
    connect: (() => void) | null;
    disconnect: ((reason: string) => void) | null;
    connectError: ((error: Error) => void) | null;
    reconnect: ((attemptNumber: number) => void) | null;
    terminalExit: ((data: any) => void) | null;
  }>({
    terminalHistory: null,
    terminalData: null,
    terminalCommand: null,
    terminalCreated: null,
    connect: null,
    disconnect: null,
    connectError: null,
    reconnect: null,
    terminalExit: null,
  });
  
  // Use enhanced supervision context
  const { 
    isSupervisionActive, 
    toggleSupervision, 
    enableSupervision,
    activeConfiguration,
    isConfigModalOpen,
    setConfigModalOpen,
    saveConfiguration,
    configurations,
    templates
  } = useEnhancedSupervision();
  const [terminalMode, setTerminalMode] = useState<'normal' | 'vim' | 'emacs'>('normal');
  
  // ✅ READ MODEL FROM ZUSTAND STORE - This ensures real-time updates when model is changed
  const selectedClaudeModel = useModelStore(state => state.selectedModel);

  // Time Capsule: Auth and terminal state for enriched capsule data
  const authUser = useAuthStore((state) => state.user);
  const terminalHistory = useTerminalStore((state) => state.history);
  const workingDirectory = useTerminalStore((state) => state.workingDirectory);

  // MCP Manager hooks
  const { isOpen: isMCPOverlayOpen, toggle: toggleMCPOverlay, close: closeMCPOverlay } = useMCPOverlay();
  const { servers: mcpServers } = useMCPServers();
  const mcpEnabledCount = mcpServers.filter(s => s.enabled).length;

  // Auto-switch terminal mode based on selected model
  useEffect(() => {
    const modeManager = modeManagerRef.current;
    const xterm = xtermRef.current;
    
    if (!xterm || !modeManager) return;
    
    const currentMode = modeManager.getCurrentMode();
    
    const notifyUser = (message: string) => {
      xterm.writeln(`\r\n${message}`);
    };
    
    // Only switch if we're not already in the correct mode
    if (selectedClaudeModel.startsWith('gemini-') && currentMode !== 'GEMINI_API') {
      // Switch to Gemini mode
      modeManager.switchToGemini(xterm, { notifyUser }).catch(err => {
        console.error('Failed to switch to Gemini:', err);
      });
    } else if ((selectedClaudeModel.startsWith('claude-') || selectedClaudeModel.startsWith('glm-')) && currentMode !== 'CLAUDE_CLI') {
      // Switch to Claude CLI for Claude models and GLM (GLM uses Z.AI backend)
      modeManager.switchToClaude({ notifyUser }).catch(err => {
        console.error('Failed to switch to Claude:', err);
      });
    } else {
    }
  }, [selectedClaudeModel]);
  
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Handle Claude model changes - updates Zustand store (no local state needed)
  const handleModelChange = (model: string) => {
    useModelStore.getState().setSelectedModel(model);
  };
  const [audioAlertsEnabled, setAudioAlertsEnabled] = useState(false);
  const [recognition, setRecognition] = useState<any | null>(null);
  const [claudeActive, setClaudeActive] = useState(false);
  // Time Capsule: Commit data for the save prompt (feature-gated)
  const [timeCapsuleCommit, setTimeCapsuleCommit] = useState<{
    sessionId: string;
    sha: string;
    branch: string;
    message: string;
    duration: number;
    claudeSessionStart?: string;
    repoPath?: string;
  } | null>(null);
  const claudeActivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const claudeActivityStartedRef = useRef(false); // ⚡ Prevent repeated setState during same response (Feb 2, 2025)
  const lastDataRef = useRef<{data: string, timestamp: number} | null>(null);
  
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [conversationMode, setConversationMode] = useState(false);

  // 🔧 FIX (Feb 1, 2025): Notify parent when Claude active state changes
  // This allows parent to skip expensive regex processing in contextual memory
  useEffect(() => {
    onClaudeActiveChange?.(claudeActive);
  }, [claudeActive, onClaudeActiveChange]);

  // 🎨 UX FIX (Feb 1, 2025): Show "thinking" message when Claude becomes active
  // This gives users visual feedback that something is happening during response delays
  useEffect(() => {
    if (claudeActive && xtermRef.current && conversationMode) {
      const term = xtermRef.current;
      // Write thinking message to terminal - only in conversation mode
      term.write('\r\n\x1b[38;5;39m⏳ Claude is processing your request...\x1b[0m\r\n');
    }
  }, [claudeActive, conversationMode]);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [totalTokens, setTotalTokens] = useState(0);
  const [usageCost, setUsageCost] = useState('$0.0000');
  const [mcpStatus, setMcpStatus] = useState<{ healthy: number; total: number; status: string }>({
    healthy: 0,
    total: 0,
    status: 'unknown'
  });
  const [blockResetTime, setBlockResetTime] = useState<string>('--:--:--');
  
  // UI Store for toasts
  const { addToast } = useUIStore();
  
  // Sandbox creation state
  const [sandboxCreationStatus, setSandboxCreationStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [sandboxCreationMessage, setSandboxCreationMessage] = useState<string>('');
  const [createdSandboxId, setCreatedSandboxId] = useState<string>('');
  const [showSandboxPanel, setShowSandboxPanel] = useState(false);
  
  // Feature flag for staged command line
  const ENABLE_STAGED_COMPOSER = process.env.NEXT_PUBLIC_ENABLE_STAGED_COMPOSER !== 'false'; // Default to enabled
  
  // Staged composer state
  const [composerVisible, setComposerVisible] = useState(false);
  const [stagedCommand, setStagedCommand] = useState('');
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  
  // Planning mode state
  const [planningMode, setPlanningMode] = useState(false);
  const [plannedCommands, setPlannedCommands] = useState<string[]>([]);
  
  // Terminal session state - needed for various features
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [terminalReady, setTerminalReady] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [errorDoctorActive, setErrorDoctorActive] = useState(true);
  const socketRef = useRef<any>(null); // Will be Socket instance after async init
  const lastResizeDimsRef = useRef<{ cols: number; rows: number }>({ cols: 0, rows: 0 });
  const resizeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🔧 FIX PART 3 (Nov 23, 2025): Buffer agent terminal data until xterm is ready
  // CRITICAL: Agent terminals start hidden (display:none), xterm can't initialize
  // BUT data starts flowing immediately from backend Claude CLI
  // Buffer stores data until terminal becomes visible and xterm initializes
  const agentDataBufferRef = useRef<string>('');
  
  // Error Doctor modal states - MUST be declared before useEffects that use them
  const [showErrorDoctorModal, setShowErrorDoctorModal] = useState(false);
  const [hasActiveError, setHasActiveError] = useState(false);
  const [errorHistory, setErrorHistory] = useState<string[]>([]);
  
  // Console capture states
  const [consoleErrors, setConsoleErrors] = useState<CapturedConsoleError[]>([]);
  const [isAnalyzingWithClaude, setIsAnalyzingWithClaude] = useState(false);
  const [currentLineBuffer, setCurrentLineBuffer] = useState('');
  const [selectedSoundPreset, setSelectedSoundPreset] = useState<SoundPreset>('gentle');
  
  // Context menu state
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  
  // Notify parent when composer visibility changes
  useEffect(() => {
    onComposerVisibilityChange?.(composerVisible);
  }, [composerVisible, onComposerVisibilityChange]);
  
  // 🔧 DELETED (Nov 18, 2025): Removed terminal restoration useEffect - caused infinite ping-pong loop
  // PROBLEM: Terminal writes sessionId → localStorage → Parent reads → passes as restoredSessionId prop
  //          → This effect writes sessionId → localStorage → Parent reads → infinite loop
  // SOLUTION: Parent (IDE page) handles session restoration entirely via prop. No restoration needed here.
  
  // 🔧 FIX (Oct 24, 2025): Reset session creation flag on navigation
  // When navigating IDE → Timeline → IDE, Terminal component stays mounted (React optimization)
  // This causes sessionCreatedRef to stay true, blocking session restoration
  // Solution: Reset the flag when we receive a restoredSessionId from navigation
  // CRITICAL: Must work even when returning to SAME session (restoredSessionId === sessionId)
  // 🔧 FIX (Nov 15, 2025): Skip for agent terminals
  useEffect(() => {
    // Agent terminals don't participate in navigation restoration
    if (agentMode) return;
    
    if (restoredSessionId && restoredSessionId !== 'null') {
      // Reset flag if:
      // 1. Session changed (different ID) OR
      // 2. Component stayed mounted (flag is true, indicating navigation without unmount)
      if (restoredSessionId !== sessionId || sessionCreatedRef.current) {
        console.log('   restoredSessionId:', restoredSessionId, 'sessionId:', sessionId, 'flagWasSet:', sessionCreatedRef.current);
        sessionCreatedRef.current = false;
      }
    }
  }, [restoredSessionId, sessionId, agentMode]);
  
  // Default terminal settings - guaranteed structure
  const defaultTerminalSettings: TerminalSettingsState = {
    skipPermissions: false,
    statusLine: {
      enabled: false,
      showFile: true,
      showModel: true,
      showTokens: true
    }
  };

  // Validate and migrate terminal settings
  const validateTerminalSettings = (settings: any): TerminalSettingsState => {
    logger.debug('[Terminal] Validating settings:', settings);
    
    // Handle legacy or malformed data
    if (!settings || typeof settings !== 'object') {
      logger.debug('[Terminal] Invalid settings object, using defaults');
      return defaultTerminalSettings;
    }

    // Ensure statusLine structure exists and is valid
    const statusLine = settings.statusLine || {};
    const validatedSettings: TerminalSettingsState = {
      skipPermissions: typeof settings.skipPermissions === 'boolean' ? settings.skipPermissions : defaultTerminalSettings.skipPermissions,
      statusLine: {
        enabled: typeof statusLine.enabled === 'boolean' ? statusLine.enabled : defaultTerminalSettings.statusLine.enabled,
        showFile: typeof statusLine.showFile === 'boolean' ? statusLine.showFile : defaultTerminalSettings.statusLine.showFile,
        showModel: typeof statusLine.showModel === 'boolean' ? statusLine.showModel : defaultTerminalSettings.statusLine.showModel,
        showTokens: typeof statusLine.showTokens === 'boolean' ? statusLine.showTokens : defaultTerminalSettings.statusLine.showTokens
      }
    };

    logger.debug('[Terminal] Validated settings:', validatedSettings);
    return validatedSettings;
  };

  // Terminal settings state - guaranteed to have proper structure
  const [terminalSettings, setTerminalSettings] = useState<TerminalSettingsState>(defaultTerminalSettings);

  // Fetch context stats (moved from StatusBarCore)
  const fetchContextStats = async () => {
    try {
      setContextStats(prev => ({ ...prev, isLoading: true }));
      
      const response = await fetch('/api/context/stats', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const stats = await response.json();
        
        const newContextStats = {
          totalSessions: stats.totalSessions || 0,
          totalMemories: stats.totalConversations || 0,
          isActive: (stats.totalConversations || 0) > 0 || (stats.totalSessions || 0) > 0,
          isLoading: false
        };
        
        setContextStats(newContextStats);
      } else {
        setContextStats(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      setContextStats(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Load terminal settings from localStorage on mount
  useEffect(() => {
    logger.debug('[Terminal] Loading terminal settings from localStorage on mount');
    const savedSettings = localStorage.getItem('coder1-terminal-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        logger.debug('[Terminal] Raw loaded settings:', parsed);
        const validatedSettings = validateTerminalSettings(parsed);
        setTerminalSettings(validatedSettings);
        
        // Save back the validated settings to ensure localStorage is clean
        localStorage.setItem('coder1-terminal-settings', JSON.stringify(validatedSettings));
        logger.debug('[Terminal] Settings validated and saved back to localStorage');
      } catch (error) {
        logger.error('[Terminal] Failed to parse terminal settings, using defaults:', error);
        setTerminalSettings(defaultTerminalSettings);
        // Save defaults to localStorage to fix corrupted data
        localStorage.setItem('coder1-terminal-settings', JSON.stringify(defaultTerminalSettings));
      }
    } else {
      logger.debug('[Terminal] No saved settings found in localStorage, saving defaults');
      // Save defaults on first run
      localStorage.setItem('coder1-terminal-settings', JSON.stringify(defaultTerminalSettings));
    }
  }, []);

  // Load sound alert settings from localStorage on mount
  useEffect(() => {
    logger.debug('[Terminal] Loading sound alert settings from localStorage');
    try {
      const savedEnabled = localStorage.getItem('soundAlertsEnabled');
      const savedPreset = localStorage.getItem('soundAlertPreset');
      
      
      if (savedEnabled !== null) {
        const enabled = JSON.parse(savedEnabled);
        setAudioAlertsEnabled(enabled);
        logger.debug('[Terminal] Audio alerts enabled set to:', enabled);
      } else {
        // Default to enabled for new users
        setAudioAlertsEnabled(true);
        localStorage.setItem('soundAlertsEnabled', 'true');
        logger.debug('[Terminal] No saved audio alert setting, defaulting to enabled');
      }
      
      if (savedPreset && ['gentle', 'chime', 'bell', 'chirp', 'pop'].includes(savedPreset)) {
        setSelectedSoundPreset(savedPreset as SoundPreset);
        logger.debug('[Terminal] Sound preset set to:', savedPreset);
      }
    } catch (error) {
      logger.error('[Terminal] Failed to load sound alert settings:', error);
      setAudioAlertsEnabled(true); // Default to enabled
      localStorage.setItem('soundAlertsEnabled', 'true');
    }
  }, []);

  // Fetch context stats on mount ONLY (no interval to prevent re-renders)
  // ⚡ PERFORMANCE FIX (Feb 2, 2025): Disabled interval polling
  // Previous: setInterval → setState every 60s → re-render → new TerminalModeManager
  // Result: Progressive lag as intervals accumulate overhead
  useEffect(() => {
    fetchContextStats(); // Fetch once on mount
    
    // DISABLED: Interval polling causes unnecessary re-renders
    // If stats need updating, trigger fetch manually or use WebSocket push instead of polling
    
    // const statsInterval = setInterval(() => {
    //   console.log('🔍 Terminal: Interval fetchContextStats...');
    //   fetchContextStats();
    // }, 60000);
    // 
    // return () => {
    //   clearInterval(statsInterval);
    // };
  }, []);

  // Initialize console capture service explicitly
  // 🚨 DISABLED: Console capture causes browser console spam (2000+ hidden messages)
  // The service intercepts ALL console calls, creating performance issues
  // Error Doctor still works via terminal error detection
  useEffect(() => {
    // DISABLED - Re-enable if Error Doctor console monitoring is needed
    // if (!consoleCaptureService.isCapturing()) {
    //   console.log('🔍 Starting console capture service...');
    //   consoleCaptureService.start();
    //   
    //   // Expose on window for debugging
    //   if (typeof window !== 'undefined') {
    //     (window as any).consoleCaptureService = consoleCaptureService;
    //     console.log('✅ Console capture service exposed on window.consoleCaptureService');
    //   }
    // }
    
    return () => {
      // Keep service running across component unmounts
      // consoleCaptureService.stop();
    };
  }, []);
  
  // Sync console errors and update error indicator
  useEffect(() => {
    const updateConsoleErrors = () => {
      const captured = consoleCaptureService.getErrors();
      setConsoleErrors(captured);
      
      // Debug logging
      if (captured.length > 0) {
      }
      
      // Update hasActiveError using a callback to get current state
      setHasActiveError(prev => {
        // Get current error history from state via callback
        const hasConsoleError = captured.length > 0;
        // We'll check terminal errors via another way to avoid stale closure
        return hasConsoleError || prev; // Keep existing state if we have console errors
      });
    };

    // 🚨 DISABLED: Console capture causes browser console spam (2000+ hidden messages)
    // The interval was running every 500ms, intercepting ALL console calls
    // This creates performance issues and console pollution
    // Error Doctor still works via terminal error detection and manual sync when modal opens
    
    // Update immediately
    // updateConsoleErrors(); // DISABLED
    
    // Set up periodic sync (every 500ms for better responsiveness)
    // const interval = setInterval(updateConsoleErrors, 500); // DISABLED
    
    // return () => clearInterval(interval); // DISABLED
  }, []); // Remove errorHistory dependency to avoid stale closures
  
  // Sync immediately when Error Doctor modal opens
  useEffect(() => {
    if (showErrorDoctorModal) {
      const captured = consoleCaptureService.getErrors();
      setConsoleErrors(captured);
    }
  }, [showErrorDoctorModal]);


  // Initialize companion service connection for Claude Code CLI access
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 🔧 FIX (Nov 22, 2025): Disable companion health checks to prevent console spam
    // The companion service causes 100+ ERR_CONNECTION_REFUSED errors that block UI rendering
    // This is especially problematic for AI Team agent terminals
    (window as any).__DISABLE_COMPANION = true;
    
    const initCompanion = async () => {
      try {
        const companion = getCompanionClient();
        companionClientRef.current = companion;
        
        // Listen for companion status changes
        companion.on('status-changed', (status: any) => {
          setCompanionConnected(status.connected);
          
          // Only show success message when Companion IS connected
          // Don't show installation tip - the server.js help message is better
          if (status.connected && xtermRef.current) {
            xtermRef.current.writeln('\r\n\x1b[32m✅ Claude Code CLI connected via Companion!\x1b[0m\r\n');
          }
        });
        
        // Check companion status
        await companion.checkInstallation();
      } catch (error) {
        console.error('Failed to initialize companion client:', error);
      }
    };
    
    initCompanion();
    
    // 🔧 FIX (Nov 22, 2025): Don't run periodic companion checks - causes console spam
    // The companion is disabled globally via __DISABLE_COMPANION flag
    // Periodic checks would bypass this and flood console with errors
    // const checkInterval = setInterval(() => {
    //   if (companionClientRef.current) {
    //     companionClientRef.current.checkInstallation();
    //   }
    // }, 30000); // Check every 30 seconds
    
    return () => {
      // clearInterval(checkInterval);
      if (companionClientRef.current) {
        companionClientRef.current.disconnect();
      }
    };
  }, []);

  // Auto-checkpoint hook
  // 🔧 FIX (Jan 31, 2026): Pause auto-checkpoints during connection instability
  // This prevents "freezing" when state is churning during restoration
  useAutoCheckpoint({
    sessionId: sessionId || undefined,
    enabled: true,
    isConnected,
    isRestoring: restorationState === 'restoring' || restorationState === 'reconnecting'
  });

  // Listen for terminal settings changes from TerminalSettings component
  // Listen for terminal settings changes from TerminalSettings component
  useEffect(() => {
    const handleSettingsChange = (event: CustomEvent) => {
      logger.debug('[Terminal] Received terminalSettingsChanged event:', event.detail);
      
      // Reload settings from localStorage with validation
      const savedSettings = localStorage.getItem('coder1-terminal-settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          logger.debug('[Terminal] Raw updated settings from localStorage:', parsed);
          const validatedSettings = validateTerminalSettings(parsed);
          setTerminalSettings(validatedSettings);
          logger.debug('[Terminal] Settings updated and validated after event');
        } catch (error) {
          logger.error('[Terminal] Failed to parse updated terminal settings, reverting to defaults:', error);
          setTerminalSettings(defaultTerminalSettings);
          localStorage.setItem('coder1-terminal-settings', JSON.stringify(defaultTerminalSettings));
        }
      } else {
        logger.warn('[Terminal] No settings found in localStorage after change event, using defaults');
        setTerminalSettings(defaultTerminalSettings);
        localStorage.setItem('coder1-terminal-settings', JSON.stringify(defaultTerminalSettings));
      }
    };

    // Add event listener for settings changes
    window.addEventListener('terminalSettingsChanged', handleSettingsChange as EventListener);
    
    // Cleanup event listener
    return () => {
      window.removeEventListener('terminalSettingsChanged', handleSettingsChange as EventListener);
    };
  }, []);
  
  // Fetch token usage periodically when statusline is enabled
  useEffect(() => {
    if (!terminalSettings.statusLine.enabled) return;
    
    const fetchUsage = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('/api/claude/usage', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setTotalTokens(data.tokens || 0);
            setUsageCost(data.formattedCost || '$0.0000');
          }
        }
      } catch (error) {
        // Use console.warn instead of console.error to reduce noise
        // logger?.warn('Failed to fetch Claude usage:', error);
      }
    };
    
    // Fetch immediately and then every 60 seconds (reduced from 30)
    fetchUsage();
    const interval = setInterval(fetchUsage, 60000);
    
    return () => clearInterval(interval);
  }, [terminalSettings.statusLine.enabled]);
  
  // Fetch MCP server status periodically when statusline is enabled
  useEffect(() => {
    if (!terminalSettings.statusLine.enabled) return;
    
    const fetchMCPStatus = async () => {
      try {
        const response = await fetch('/api/claude/mcp-status');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setMcpStatus({
              healthy: data.summary.healthy,
              total: data.summary.total,
              status: data.healthStatus
            });
          }
        }
      } catch (error) {
        // logger?.error('Failed to fetch MCP status:', error);
      }
    };
    
    // ⚡ PERFORMANCE FIX (Feb 2, 2025): Defer initial MCP status fetch by 3 seconds
    // The claude mcp list command takes ~7s, so we defer it to not block initial render
    const initialDelay = setTimeout(() => fetchMCPStatus(), 3000);
    const interval = setInterval(fetchMCPStatus, 60000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [terminalSettings.statusLine.enabled]);
  
  // Calculate block reset timer (resets every 3 hours)
  useEffect(() => {
    if (!terminalSettings.statusLine.enabled) return;
    
    const updateBlockTimer = () => {
      // Get or create the block start time
      const blockStartKey = 'claude-block-start-time';
      let blockStartTime = localStorage.getItem(blockStartKey);
      
      if (!blockStartTime) {
        // If no start time, set it now
        blockStartTime = new Date().toISOString();
        localStorage.setItem(blockStartKey, blockStartTime);
      }
      
      const startTime = new Date(blockStartTime);
      const now = new Date();
      const resetTime = new Date(startTime.getTime() + (3 * 60 * 60 * 1000)); // 3 hours from start
      
      // Check if we've passed the reset time
      if (now >= resetTime) {
        // Reset the timer
        const newStartTime = new Date().toISOString();
        localStorage.setItem(blockStartKey, newStartTime);
        setBlockResetTime('3:00:00');
      } else {
        // Calculate time remaining
        const remaining = resetTime.getTime() - now.getTime();
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
        
        setBlockResetTime(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };
    
    // Update immediately and then every second
    updateBlockTimer();
    const interval = setInterval(updateBlockTimer, 1000);
    
    return () => clearInterval(interval);
  }, [terminalSettings.statusLine.enabled]);

  // Save terminal settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('coder1-terminal-settings', JSON.stringify(terminalSettings));
  }, [terminalSettings]);

  // Poll for active AI Team agents (Nov 26, 2025)
  useEffect(() => {
    const pollAgents = async () => {
      try {
        const res = await fetch('/api/puppet-bridge/stop');
        if (res.ok) {
          const data = await res.json();
          // Use totalWorkflows instead of totalAgents (workflows are the running teams)
          const count = data.summary?.totalWorkflows || data.summary?.totalAgents || 0;
          setActiveAgentCount(count);
        }
      } catch (err) {
        // Silently fail - not critical
      }
    };
    
    const interval = setInterval(pollAgents, 3000); // Poll every 3 seconds
    pollAgents(); // Initial check
    return () => clearInterval(interval);
  }, []);

  // These states are declared at the beginning of the component with all other states

  // Separate effect to update error state when errorHistory changes
  useEffect(() => {
    const hasTerminalError = errorHistory.length > 0;
    setHasActiveError(prev => hasTerminalError || (consoleErrors.length > 0));
  }, [errorHistory, consoleErrors]);

  // Save sound alert settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('soundAlertsEnabled', JSON.stringify(audioAlertsEnabled));
    logger.debug('[Terminal] Saved audio alerts enabled setting:', audioAlertsEnabled);
  }, [audioAlertsEnabled]);

  useEffect(() => {
    localStorage.setItem('soundAlertPreset', selectedSoundPreset);
    logger.debug('[Terminal] Saved sound preset setting:', selectedSoundPreset);
  }, [selectedSoundPreset]);
  
  // Performance-safe callback helper - no intervals, immediate execution
  const notifyTerminalReady = React.useCallback((newSessionId: string | null, ready: boolean) => {
    if (onTerminalReady) {
      try {
        onTerminalReady(newSessionId, ready);
      } catch (error) {
        // logger?.error('[Terminal] onTerminalReady callback error:', error);
      }
    }
  }, [onTerminalReady]);
  const [showSoundPresetDropdown, setShowSoundPresetDropdown] = useState(false);
  const soundButtonRef = useRef<HTMLButtonElement>(null);
  const soundDropdownRef = useRef<HTMLDivElement>(null);
  
  // State for Claude copy button (drag-drop files)
  const [showClaudeCopyButton, setShowClaudeCopyButton] = useState(false);
  const [claudeCopyContent, setClaudeCopyContent] = useState('');
  
  // State for simple button management (no complex positioning needed)
  const [currentFileCount, setCurrentFileCount] = useState<number>(0);

  // Context stats state (moved from StatusBarCore)
  const [contextStats, setContextStats] = useState<{
    totalSessions: number;
    totalMemories: number;
    isActive: boolean;
    isLoading: boolean;
  }>({
    totalSessions: 0,
    totalMemories: 0,
    isActive: false,
    isLoading: false
  });
  
  // Scroll tracking - Phase 1: Read-only monitoring
  const [isUserScrolled, setIsUserScrolled] = useState(false);
  const scrollCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Phase 4: Debouncing for flicker reduction
  const scrollDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Output buffering for performance optimization
  const outputBufferRef = useRef<string[]>([]);
  const outputFlushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const writeRAFRef = useRef<number | null>(null);
  const rafBatchBufferRef = useRef<string>(''); // RAF batching buffer for performance (Feb 2, 2025)
  
  // 🚀 TWO-LAYER BATCHING: Agent terminal output (Nov 26, 2025 - Fix for repeating status lines)
  // Layer 1: setTimeout(10ms) groups rapid chunks into array
  // Layer 2: RAF batches joined output for 60fps rendering
  const agentOutputBufferRef = useRef<string[]>([]);
  const agentFlushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const agentWriteRAFRef = useRef<number | null>(null);
  const agentRafBatchBufferRef = useRef<string>('');
  
  const lastLocalStorageSaveRef = useRef<number>(0); // Track last localStorage save time for throttling
  const lastBufferLengthRef = useRef<number>(0); // Track buffer length to optimize scroll logic
  const lastFlushTimeRef = useRef<number>(Date.now()); // Track last flush time to detect idle periods
  const lastDataSizeRef = useRef<number>(0); // Track data chunk size to skip scroll on keystroke echoes (Feb 2, 2025)

  // Refit terminal when status line is toggled
  useEffect(() => {
    if (fitAddonRef.current && xtermRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 50);
    }
  }, [terminalSettings.statusLine.enabled]);

  // Create terminal session on mount via REST API
  useEffect(() => {
    // Prevent duplicate session creation
    if (sessionCreatedRef.current) {
      // REMOVED: // REMOVED: console.log('Session already created, skipping');
      return;
    }
    
    // Wait for prop restoration to complete
    // If restoredSessionId exists but sessionId isn't set yet, the prop restoration effect hasn't run
    if (restoredSessionId && !sessionId) {
      console.log('⏳ Waiting for prop restoration to set sessionId...');
      return; // Exit early, will run again when sessionId is set
    }
    
    const createTerminalSession = async () => {
      // 🔧 FIX: Session ID restoration now handled via restoredSessionId prop from IDE page
      // This prevents race conditions and provides single source of truth
      
      sessionCreatedRef.current = true;
      
      // Check if we already have a session ID from prop restoration
      if (sessionId && !sandboxMode && !agentMode) {
        setTerminalReady(true);
        notifyTerminalReady(sessionId, true);
        return; // Server will reconnect to this session
      }
      // REMOVED: // REMOVED: console.log('🚀 CREATING TERMINAL SESSION...');
      
      try {
        // Always try REST API first, regardless of environment
        // This ensures proper session creation on the server
        const response = await fetch('/api/terminal-rest/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cols: 130,
            rows: 30,
            sandbox: sandboxMode,
            checkpointName: sandboxSession?.name || 'Sandbox Session',
            // Add agent session info for Claude tabs
            agentMode: agentMode || false,
            agentSession: agentMode ? {
              id: agentSession?.id,
              name: agentSession?.name,
              role: agentSession?.role
            } : undefined
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setSessionId(data.sessionId);
          // Immediately update the ref for voice recognition
          sessionIdForVoiceRef.current = data.sessionId;
          // Make session ID globally available for drag-drop
          if (typeof window !== 'undefined') {
            (window as any).terminalSessionId = data.sessionId;
            // 🔧 FIX: Store session ID in localStorage for persistence
            if (!sandboxMode && !agentMode) {
              localStorage.setItem('ide-terminalSessionId', data.sessionId);
            }
          }
          setTerminalReady(true);
          // Notify parent component - performance-safe callback
          notifyTerminalReady(data.sessionId, true);
        } else {
          // Fallback: let server generate session ID via Socket.IO
          // Don't set a session ID here - let the server generate one
          setTerminalReady(true);
          notifyTerminalReady(null, true);
        }
      } catch (error) {
        // Don't set a session ID here - let the server generate one via Socket.IO
        setTerminalReady(true);
        notifyTerminalReady(null, true);
      }
    };
    
    createTerminalSession();
    
    // Cleanup function
    return () => {
      // Session cleanup will be handled in separate effect
    };
  }, [restoredSessionId, sessionId]); // Depend on both prop and state to handle restoration
  
  // Store whether component is mounted
  const isMountedRef = useRef(true);
  const lastCleanupTimeRef = useRef(0);
  const cleanupInProgressRef = useRef(false);
  const failedCleanupSessionsRef = useRef(new Set<string>());
  
  // Session validation and management functions
  const isValidSession = (sid: string | null): boolean => {
    if (!sid || sid.startsWith('simulated-')) return false;
    if (failedCleanupSessionsRef.current.has(sid)) return false;
    return true;
  };
  
  const validateCurrentSession = (): boolean => {
    const currentSid = sessionIdForVoiceRef.current || sessionId;
    return isValidSession(currentSid);
  };
  
  const checkSessionExists = async (sid: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/terminal-rest/sessions/${sid}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      console.log('Session existence check failed:', error);
      return false;
    }
  };
  
  // Cleanup session only on actual unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Clean up Claude activity timeout
      if (claudeActivityTimeoutRef.current) {
        clearTimeout(claudeActivityTimeoutRef.current);
        claudeActivityTimeoutRef.current = null;
      }
      
      // Clean up scroll tracking interval
      if (scrollCheckIntervalRef.current) {
        clearInterval(scrollCheckIntervalRef.current);
        scrollCheckIntervalRef.current = null;
      }

      // Clean up scroll debounce timer
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
        scrollDebounceRef.current = null;
      }
      
      // Clean up auto-scroll during selection
      if (scrollIntervalRef.current) {
        cancelAnimationFrame(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
      
      // ✅ Dispose xterm onSelectionChange listener
      if (selectionChangeDisposableRef.current) {
        selectionChangeDisposableRef.current.dispose();
        selectionChangeDisposableRef.current = null;
      }
      
      // Remove mouse listener from .xterm-screen canvas
      const handlers = selectionHandlersRef.current;
      if (handlers.mousemove && terminalRef.current) {
        const xtermScreen = terminalRef.current.querySelector('.xterm-screen') as HTMLElement;
        if (xtermScreen) {
          xtermScreen.removeEventListener('mousemove', handlers.mousemove);
        }
      }
      selectionHandlersRef.current = { mousedown: null, mouseup: null, mousemove: null };
      
      // Clean up output buffering timers
      if (outputFlushTimeoutRef.current) {
        clearTimeout(outputFlushTimeoutRef.current);
        outputFlushTimeoutRef.current = null;
      }
      
      if (writeRAFRef.current) {
        cancelAnimationFrame(writeRAFRef.current);
        writeRAFRef.current = null;
      }
      
      // Clear output buffers
      outputBufferRef.current = [];
      rafBatchBufferRef.current = ''; // Clear RAF batch buffer (Feb 2, 2025)
      
      // Dispose of onData handler
      if (onDataDisposableRef.current) {
        onDataDisposableRef.current.dispose();
        onDataDisposableRef.current = null;
      }
      
      // Stop speech recognition if active
      if (recognition) {
        try {
          recognition.stop();
          recognition.onresult = null;
          recognition.onerror = null;
          recognition.onend = null;
        } catch (error) {
          // Silently handle
        }
      }
      
      // Disconnect socket if needed
      if (socketRef.current) {
        socketRef.current.off('terminal:data');
        socketRef.current.off('terminal:created');
        socketRef.current.off('terminal:error');
        socketRef.current.off('claude:output');
        socketRef.current.off('claude:sessionComplete');
        socketRef.current.off('claude:error');
        socketRef.current.off('ai-team:progress');
        socketRef.current.off('ai-team:complete');
      }
      
      // DISABLED: HTTP DELETE cleanup that was causing server crashes
      // The unified server manages terminal sessions entirely in-memory via Socket.IO.
      // HTTP DELETE requests are unnecessary and were causing DELETE cascades that
      // overwhelmed the server with hundreds of 500 errors leading to EMFILE crashes.
      // 
      // Session cleanup is now handled automatically by the unified server's
      // memory management system (server.js lines 784-851).
      const currentSessionId = sessionIdForVoiceRef.current || sessionId;
      if (currentSessionId && !currentSessionId.startsWith('simulated-')) {
        
        // Only perform local component cleanup - no HTTP requests
        // The unified server will handle session cleanup automatically
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // This useEffect has been removed to prevent duplicate socket connections
  // All socket connection logic is now handled in connectToBackend function

  // Use a ref to track if initialization has started (prevents race conditions)
  const initializingRef = useRef(false);

  useEffect(() => {
    // 🔧 FIX (Nov 19, 2025): Prevent double initialization with both instance check and flag
    if (xtermRef.current || initializingRef.current) {
      if (xtermRef.current) {
      } else {
        console.log('⏳ [XTERM-INIT] Initialization in progress, skipping duplicate call');
      }
      return;
    }
    
    initializingRef.current = true; // Mark as initializing

    const initializeTerminal = async () => {
      // 🔧 FIX (Nov 19, 2025): Wait for terminal ref to be ready (poll with timeout)
      // This is critical for agent/sandbox terminals which may mount before DOM is ready
      let terminalRefReady = terminalRef.current;
      let attempts = 0;
      while (!terminalRefReady && attempts < 50) { // Wait up to 5 seconds
        await new Promise(resolve => setTimeout(resolve, 100));
        terminalRefReady = terminalRef.current;
        attempts++;
      }
      
      if (!terminalRefReady) {
        console.error('❌ [XTERM-INIT] Terminal ref never became ready after 5 seconds');
        return;
      }
      
      try {
        // REMOVED: // REMOVED: console.log('🔧 Creating XTerm instance...');
        // Wait for xterm.js to load if not already available
        if (!XTerm && typeof window !== 'undefined') {
          console.log('⏳ Waiting for xterm.js to load...');
          // Dynamically import xterm modules
          const xtermModule = await import('@xterm/xterm');
          const fitModule = await import('@xterm/addon-fit');
          XTerm = xtermModule.Terminal;
          FitAddon = fitModule.FitAddon;
          
          // Import CSS
          await import('@xterm/xterm/css/xterm.css');
        }
        
        // Initialize terminal with performance-optimized settings
        if (!XTerm) {
          console.error('XTerm not loaded - running in SSR environment');
          return;
        }
        
        const term = new XTerm({
          theme: {
            background: '#0a0a0a',
            foreground: '#ffffff',
            cursor: '#00D9FF',
            cursorAccent: '#00D9FF',
            selectionBackground: 'rgba(0, 217, 255, 0.3)',
          },
          fontSize: 13,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          cursorBlink: true,
          cursorStyle: 'block',
          allowProposedApi: true, // Add this to prevent API warnings
          // Performance optimizations and scrolling configuration
          scrollback: 50000, // Support long Claude Code sessions with full history retention
          fastScrollModifier: 'ctrl', // Enable fast scrolling with Ctrl key
          smoothScrollDuration: 0, // Disable smooth scrolling animations
          scrollOnUserInput: true,
          scrollSensitivity: 1,
          // Enhanced scrolling for better bottom access
          minimumContrastRatio: 1, // Ensures all content is visible
          allowTransparency: false, // Improve rendering consistency
        });

      if (!FitAddon) {
        console.error('FitAddon not loaded - running in SSR environment');
        return;
      }
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      
      // Ensure the container is ready before opening
      // 🔧 FIX (Nov 19, 2025): For agent/sandbox terminals, open even if hidden (offsetParent === null)
      // Hidden terminals need xterm initialized so they can receive data via WebSocket
      const shouldOpen = terminalRef.current && (
        terminalRef.current.offsetParent !== null || // Visible terminal
        agentMode ||  // Agent terminal (may be in hidden tab)
        sandboxMode   // Sandbox terminal (may be in hidden tab)
      );
      
      if (shouldOpen) {
        term.open(terminalRef.current!);
        
        // Global paste handler for image interception
        const handleImagePaste = async (e: ClipboardEvent) => {
          // Only handle if terminal has focus
          if (!terminalRef.current?.contains(document.activeElement)) return;
          
          const items = e.clipboardData?.items;
          if (!items) return;
          
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
              // Prevent base64 text from appearing
              e.preventDefault();
              e.stopPropagation();
              
              // Convert to File
              const blob = item.getAsFile();
              if (!blob) continue;
              
              const timestamp = Date.now();
              const extension = item.type.split('/')[1] || 'png';
              const fileName = `pasted-image-${timestamp}.${extension}`;
              const file = new File([blob], fileName, { type: item.type });
              
              // Show user feedback
              term.writeln(`\r\n📎 [Image: ${fileName} (${(file.size/1024).toFixed(1)}KB)]`);
              
              // Bridge the file to make it available to Claude
              try {
                const formData = new FormData();
                formData.append('files', file);
                
                const response = await fetch('/api/claude/bridge-files', {
                  method: 'POST',
                  body: formData
                });
                
                if (response.ok) {
                  const data = await response.json();
                  
                  // Store in session context
                  if (typeof window !== 'undefined') {
                    if (!(window as any).pastedImages) {
                      (window as any).pastedImages = [];
                    }
                    (window as any).pastedImages.push({
                      name: fileName,
                      id: data.files?.[0]?.id,
                      timestamp: timestamp
                    });
                  }
                  
                  term.writeln(`✅ Image ready for Claude. Ask any question about it.\r\n`);
                } else {
                  term.writeln(`⚠️ Failed to process image. Please try dragging it instead.\r\n`);
                }
              } catch (error) {
                console.error('Failed to bridge pasted image:', error);
                term.writeln(`⚠️ Error processing image. Please try again.\r\n`);
              }
              
              break; // Only handle first image
            }
          }
        };
        
        // Store the handler in ref for cleanup
        pasteHandlerRef.current = handleImagePaste;
        
        // Add paste listener at document level with capture phase
        setTimeout(() => {
          document.addEventListener('paste', handleImagePaste, true);
        }, 100);
        
        // ✅ AUTO-SCROLL DURING TEXT SELECTION - v3 (Using xterm.js Selection API)
        // Implements auto-scroll when user drags to select text near viewport edges
        const SCROLL_THRESHOLD = 50; // Pixels from edge to trigger scroll
        const SCROLL_SPEED = 3; // Lines to scroll per frame
        
        // Scroll loop - recalculates direction EVERY FRAME
        const scrollLoop = () => {
          if (!isSelectingRef.current || !terminalRef.current || !term) {
            // Stop if selection ended
            if (scrollIntervalRef.current) {
              cancelAnimationFrame(scrollIntervalRef.current);
              scrollIntervalRef.current = null;
            }
            return;
          }
          
          // Recalculate scroll direction every frame based on current mouse position
          const terminalRect = terminalRef.current.getBoundingClientRect();
          const mouseY = mouseYRef.current;
          const distanceFromTop = mouseY - terminalRect.top;
          const distanceFromBottom = terminalRect.bottom - mouseY;
          
          // Check if should scroll
          const shouldScrollDown = distanceFromBottom < SCROLL_THRESHOLD && distanceFromBottom > 0;
          const shouldScrollUp = distanceFromTop < SCROLL_THRESHOLD && distanceFromTop > 0;
          
          if (shouldScrollDown) {
            term.scrollLines(SCROLL_SPEED);
            scrollIntervalRef.current = requestAnimationFrame(scrollLoop);
          } else if (shouldScrollUp) {
            term.scrollLines(-SCROLL_SPEED);
            scrollIntervalRef.current = requestAnimationFrame(scrollLoop);
          } else {
            // Mouse not near edges, stop scrolling
            if (scrollIntervalRef.current) {
              cancelAnimationFrame(scrollIntervalRef.current);
              scrollIntervalRef.current = null;
            }
          }
        };
        
        // ✅ Use xterm.js onSelectionChange to detect when user is selecting text
        // IMPORTANT: This fires VERY frequently during selection, so we optimize carefully
        selectionChangeDisposableRef.current = term.onSelectionChange(() => {
          const hasSelection = term.hasSelection();
          const wasSelecting = isSelectingRef.current;
          
          // Only update state if it actually changed (prevents redundant work)
          if (hasSelection === wasSelecting) return;
          
          isSelectingRef.current = hasSelection;
          
          // Start scroll loop when selection begins (only if not already running)
          if (hasSelection && !scrollIntervalRef.current) {
            scrollIntervalRef.current = requestAnimationFrame(scrollLoop);
          }
          
          // Stop scroll loop when selection ends
          if (!hasSelection && scrollIntervalRef.current) {
            cancelAnimationFrame(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
          }
        });
        
        // ✅ Track mouse position on xterm's canvas (where rendering happens)
        setTimeout(() => {
          const xtermScreen = terminalRef.current?.querySelector('.xterm-screen') as HTMLElement;
          if (xtermScreen) {
            const handleMouseMove = (e: MouseEvent) => {
              mouseYRef.current = e.clientY;
            };
            
            xtermScreen.addEventListener('mousemove', handleMouseMove);
            
            // Store handler for cleanup
            selectionHandlersRef.current = {
              mousedown: null,
              mouseup: null,
              mousemove: handleMouseMove
            };
            
          } else {
            console.warn('⚠️ Could not find .xterm-screen element for auto-scroll');
          }
        }, 100); // Wait for xterm to render DOM
        
        // Use same timing as ResizeObserver which works correctly
        setTimeout(() => {
          try {
            // Safety check: Ensure terminal has dimensions before fitting
            if (terminalRef.current && terminalRef.current.offsetWidth > 0 && terminalRef.current.offsetHeight > 0) {
              fitAddon.fit();
              
              // Second fit after DOM settles, matching resize timing
              setTimeout(() => {
                if (terminalRef.current && terminalRef.current.offsetWidth > 0 && terminalRef.current.offsetHeight > 0) {
                  fitAddon.fit();
                }
              }, 50);
            }
            term.focus();
            
            // Add custom welcome message
            if (process.env.NODE_ENV !== 'production' || sandboxMode || agentMode) {
              term.clear();
              
              // Handle agent terminals (including Claude tabs)
              if (agentMode && agentSession) {
                
                // Check if this is a Claude tab (starts with "Claude ")
                const isClaudeTab = agentSession.name && agentSession.name.startsWith('Claude ');
                
                if (isClaudeTab) {
                  // Simple header for Claude tabs
                  term.writeln(`\x1b[38;5;39m${agentSession.name}\x1b[0m`);
                  term.writeln('\x1b[38;5;240m' + '─'.repeat(80) + '\x1b[0m');
                  term.writeln('Starting Claude CLI...');
                  term.writeln('');
                  
                  // Auto-run claude command after a short delay
                  setTimeout(async () => {
                    // Import getSocket to get the socket instance
                    const { getSocket } = await import('@/lib/socket');
                    const socket = await getSocket();
                    const sessionId = sessionIdForVoiceRef.current;
                    
                    if (socket?.connected && sessionId) {
                      socket.emit('terminal:input', {
                        id: sessionId,
                        data: 'claude\r',
                        selectedClaudeModel: useModelStore.getState().selectedModel,
                        skipPermissions: terminalSettings.skipPermissions
                      });
                    }
                  }, 1000);
                } else {
                  // Original agent terminal display (for future use)
                  const roleColors: Record<string, string> = {
                    frontend: '\x1b[38;5;39m',   // Blue
                    backend: '\x1b[38;5;34m',    // Green
                    database: '\x1b[38;5;129m',  // Purple
                    testing: '\x1b[38;5;226m',   // Yellow
                    devops: '\x1b[38;5;208m',    // Orange
                    fullstack: '\x1b[38;5;244m'  // Gray
                  };
                  
                  const color = roleColors[agentSession.role] || roleColors.fullstack;
                  term.writeln(`${color}${agentSession.name}\x1b[0m`);
                  term.writeln('\x1b[38;5;240m' + '─'.repeat(80) + '\x1b[0m');
                  
                  // Show agent status
                  term.writeln(`\x1b[38;5;245mRole: ${agentSession.role}\x1b[0m`);
                  term.writeln(`\x1b[38;5;245mTeam: ${agentSession.teamId}\x1b[0m`);
                  if (agentSession.currentTask) {
                    term.writeln(`\x1b[38;5;245mCurrent Task: ${agentSession.currentTask}\x1b[0m`);
                  }
                  term.writeln('\x1b[38;5;240m' + '─'.repeat(80) + '\x1b[0m');
                  
                  // Write any existing terminal history  
                  if (agentSession.terminalHistory) {
                    term.write(agentSession.terminalHistory);
                  }
                  
                  term.writeln('');
                  term.writeln('🤖 AGENT TERMINAL - Interactive AI workspace');
                  term.writeln('──────────────────────────────────────────────');
                  term.writeln('');
                }
                
                // Add mock output for fallback agents
                if (agentSession.status === 'waiting' || agentSession.status === 'setup_required') {
                  // This is a fallback agent, generate some mock output
                  setTimeout(() => {
                    if (term && !term.isDisposed) {
                      // Generate mock agent output based on role
                      const mockCommands = {
                        frontend: [
                          '$ npm install react react-dom',
                          '⏳ Installing frontend dependencies...',
                          '✅ Dependencies installed successfully',
                          '',
                          '$ npx create-react-app frontend --template typescript',
                          '⏳ Creating React application structure...',
                          '✅ Frontend scaffold created',
                          '',
                          '$ cd frontend && npm run start',
                          '⏳ Starting development server...',
                          '✅ Development server running on http://localhost:3000',
                          '',
                          '💡 Frontend Developer is setting up the UI components...'
                        ],
                        backend: [
                          '$ npm init -y',
                          '⏳ Initializing backend project...',
                          '✅ Package.json created',
                          '',
                          '$ npm install express cors body-parser',
                          '⏳ Installing backend dependencies...',
                          '✅ Backend packages installed',
                          '',
                          '$ touch server.js routes.js',
                          '⏳ Creating server files...',
                          '✅ Server structure created',
                          '',
                          '💡 Backend Developer is configuring API endpoints...'
                        ],
                        database: [
                          '$ npm install mongoose mongodb',
                          '⏳ Installing database drivers...',
                          '✅ Database dependencies installed',
                          '',
                          '$ mkdir models && touch models/schema.js',
                          '⏳ Creating database models...',
                          '✅ Schema structure created',
                          '',
                          '💡 Database Engineer is designing data models...'
                        ],
                        testing: [
                          '$ npm install --save-dev jest @types/jest',
                          '⏳ Installing testing framework...',
                          '✅ Jest configured',
                          '',
                          '$ npm run test',
                          '⏳ Running test suite...',
                          '✅ All tests passing',
                          '',
                          '💡 Test Engineer is writing test cases...'
                        ],
                        devops: [
                          '$ docker --version',
                          'Docker version 20.10.17',
                          '',
                          '$ touch Dockerfile docker-compose.yml',
                          '⏳ Creating container configuration...',
                          '✅ Docker setup complete',
                          '',
                          '💡 DevOps Engineer is configuring deployment pipeline...'
                        ],
                        fullstack: [
                          '$ npm create vite@latest app -- --template react-ts',
                          '⏳ Creating full-stack application...',
                          '✅ Project scaffolded successfully',
                          '',
                          '$ cd app && npm install',
                          '⏳ Installing dependencies...',
                          '✅ All packages installed',
                          '',
                          '💡 Full-Stack Developer is building the application...'
                        ]
                      };
                      
                      const commands = mockCommands[agentSession.role] || mockCommands.fullstack;
                      
                      // Write commands with delays to simulate real work
                      let delay = 0;
                      commands.forEach((line) => {
                        setTimeout(() => {
                          if (term && !term.isDisposed) {
                            term.writeln(line);
                          }
                        }, delay);
                        delay += 300; // 300ms between lines
                      });
                      
                      // Add a final status message
                      setTimeout(() => {
                        if (term && !term.isDisposed) {
                          term.writeln('');
                          term.writeln(`\x1b[38;5;245m⚠️ Note: This is a mock demonstration. Configure Claude CLI for real AI agents.\x1b[0m`);
                          term.writeln(`\x1b[38;5;245mSee documentation for setup instructions.\x1b[0m`);
                        }
                      }, delay + 500);
                    }
                  }, 500); // Initial delay before starting mock output
                }
                
              } else if (sandboxMode) {
                
                // Display checkpoint terminal history if available
                if (sandboxSession?.terminalHistory) {
                  // Clean the terminal history to remove thinking animations and control sequences
                  let cleanedHistory = filterThinkingAnimations(sandboxSession.terminalHistory);
                  cleanedHistory = cleanStatusLines(cleanedHistory);  // Layer 3 defense
                  
                  // Write header - format checkpoint name to include date if not already present
                  let displayName = sandboxSession?.name || 'Checkpoint Session';
                  // Check if the name already has a date (contains /) or if we need to add it
                  if (sandboxSession?.checkpointData?.timestamp && !displayName.includes('/')) {
                    const checkpointDate = new Date(sandboxSession.checkpointData.timestamp);
                    const dateStr = checkpointDate.toLocaleDateString('en-US');
                    // Extract the time part from the existing name (e.g., "Checkpoint 2:58:28 PM" -> "2:58:28 PM")
                    const timePart = displayName.replace('Checkpoint ', '').replace('Auto-checkpoint ', '');
                    displayName = displayName.startsWith('Auto') 
                      ? `Auto-checkpoint ${dateStr} ${timePart}`
                      : `Checkpoint ${dateStr} ${timePart}`;
                  }
                  term.writeln('\x1b[38;5;214m' + displayName + '\x1b[0m');
                  term.writeln('\x1b[38;5;240m' + '─'.repeat(80) + '\x1b[0m');
                  term.writeln('\x1b[38;5;245mThis is a read-only view of the checkpoint. Use action buttons to interact.\x1b[0m');
                  term.writeln('\x1b[38;5;240m' + '─'.repeat(80) + '\x1b[0m');
                  term.writeln('');
                  
                  // Write the actual checkpoint content
                  term.write(cleanedHistory);
                  
                  // Add footer with instructions
                  term.writeln('');
                  term.writeln('\x1b[38;5;240m' + '─'.repeat(80) + '\x1b[0m');
                  term.writeln('\x1b[38;5;245m[End of checkpoint data]\x1b[0m');
                } else {
                  // No terminal history available - format checkpoint name to include date if not already present
                  let displayName = sandboxSession?.name || 'Checkpoint Session';
                  // Check if the name already has a date (contains /) or if we need to add it
                  if (sandboxSession?.checkpointData?.timestamp && !displayName.includes('/')) {
                    const checkpointDate = new Date(sandboxSession.checkpointData.timestamp);
                    const dateStr = checkpointDate.toLocaleDateString('en-US');
                    // Extract the time part from the existing name (e.g., "Checkpoint 2:58:28 PM" -> "2:58:28 PM")
                    const timePart = displayName.replace('Checkpoint ', '').replace('Auto-checkpoint ', '');
                    displayName = displayName.startsWith('Auto') 
                      ? `Auto-checkpoint ${dateStr} ${timePart}`
                      : `Checkpoint ${dateStr} ${timePart}`;
                  }
                  term.writeln(displayName);
                  term.writeln('──────────────────────────────────────────────');
                  term.writeln('\x1b[38;5;208m⚠️ No terminal history available in this checkpoint\x1b[0m');
                  term.writeln('');
                  term.writeln('\x1b[38;5;245mThis may happen if:\x1b[0m');
                  term.writeln('\x1b[38;5;245m• The checkpoint was created before terminal history tracking\x1b[0m');
                  term.writeln('\x1b[38;5;245m• No terminal commands were run before the checkpoint\x1b[0m');
                  term.writeln('\x1b[38;5;245m• Terminal history collection was not working at checkpoint time\x1b[0m');
                  term.writeln('');
                  term.writeln('\x1b[38;5;82mYou can start typing commands now to begin a new session.\x1b[0m');
                }
                
                if (sandboxSession?.checkpointData) {
                  const data = sandboxSession.checkpointData;
                  if (data.timestamp) {
                    term.writeln(`📅 Created: ${new Date(data.timestamp).toLocaleString()}`);
                  }
                  if (data.files && Array.isArray(data.files) && data.files.length > 0) {
                    term.writeln(`📁 Files: ${data.files.join(', ')}`);
                  }
                  if (data.commands && Array.isArray(data.commands) && data.commands.length > 0) {
                    // Show last 3 commands for context
                    term.writeln(`⚡ Recent commands:`);
                    data.commands.slice(-3).forEach((cmd: string) => {
                      term.writeln(`   • ${cmd}`);
                    });
                  }
                  term.writeln('');
                }
                term.writeln('🛡️ SANDBOX MODE - Safe exploration environment');
                term.writeln("Type 'claude' for AI assistance in sandbox");
                term.writeln('──────────────────────────────────────────────');
                term.writeln('');
              } else {
                // Show mode-specific welcome message
                const currentMode = modeManagerRef.current?.getCurrentMode() || 'CLAUDE_CLI';
                const modelName = useModelStore.getState().getModelDisplayName();
                
                if (currentMode === 'GLM_API') {
                  term.writeln(`\x1b[38;5;141mCoder1 Terminal - ${modelName} Mode\x1b[0m`);
                  term.writeln('\x1b[38;5;245mType your message and press Enter to chat\x1b[0m');
                  term.writeln('──────────────────────────────────────────────');
                  term.writeln('');
                  term.write('$ '); // Show prompt for GLM mode
                } else if (currentMode === 'GEMINI_API') {
                  term.writeln(`\x1b[38;5;141mCoder1 Terminal - ${modelName} Mode\x1b[0m`);
                  term.writeln('\x1b[38;5;245mType your message and press Enter to chat\x1b[0m');
                  term.writeln('──────────────────────────────────────────────');
                  term.writeln('');
                  term.write('$ '); // Show prompt for Gemini mode
                } else {
                  // CLAUDE_CLI mode (includes Claude models and GLM via Z.AI backend)
                  term.writeln(`\x1b[38;5;141mCoder1 Terminal - ${modelName}\x1b[0m`);
                  term.writeln('\x1b[38;5;245mConnected to bash shell with Claude Code CLI\x1b[0m');
                  term.writeln("Type 'claude' to start AI-assisted coding");
                  term.writeln('──────────────────────────────────────────────');
                  term.writeln('');
                }
              }
            }
            
            // Don't show initial prompt - backend will provide it
            // Note: Connection to backend will happen via useEffect when both sessionId and terminalReady are set
          } catch (error) {
            // REMOVED: // REMOVED: console.log('FitAddon error (non-critical):', error);
          }
        }, 100);
        
        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // ✅ Mode switching is handled by useEffect (lines 157-192)
        // Removed duplicate mode-switching code here to prevent race conditions
        
        // Check for restored terminal history from checkpoint
        if (typeof window !== 'undefined') {
          let historyToRestore: string | null = null;
          let historySource = '';
          
          // Priority 1: Use restoredHistory prop from checkpoint restore
          if (restoredHistory && !sandboxMode && !agentMode) {
            historyToRestore = restoredHistory;
            historySource = 'checkpoint restore (prop)';
          }
          
          // Priority 2: Check localStorage with terminal-type-specific keys
          if (!historyToRestore) {
            // 🚨 CRITICAL FIX: Use terminal-type-specific localStorage keys
            // Sandbox terminals use sandboxTerminalHistory_${sessionId}
            // Main terminal uses mainTerminalHistory
            // This prevents sandbox content from bleeding into main terminal
            const storageKey = sandboxMode && sandboxSession 
              ? `sandboxTerminalHistory_${sandboxSession.id}`
              : 'mainTerminalHistory';
            
            historyToRestore = localStorage.getItem(storageKey);
            historySource = `localStorage (${storageKey})`;
            
            // 🔒 CORRUPTION DETECTION (Oct 28, 2025)
            // ONLY check for focus codes - ANSI codes are legitimate for Claude Code conversations
            if (historyToRestore) {
              const hasFocusCodes = historyToRestore.includes('\x1b[I') || historyToRestore.includes('\x1b[O');
              
              if (hasFocusCodes) {
                console.warn(`⚠️ CORRUPTED TERMINAL HISTORY DETECTED (focus codes)`);
                console.warn(`  - Clearing corrupted data from localStorage`);
                localStorage.removeItem(storageKey);
                historyToRestore = null;
                historySource = 'none (corruption detected)';
              }
            }
          }
          
          // Only restore if terminal is visible (prevents race conditions during tab switching)
          if (historyToRestore && historyToRestore.trim() && isVisible) {
            console.log(`  - Original length: ${historyToRestore.length}`);
            console.log(`  - First 200 chars:`, historyToRestore.substring(0, 200));
            
            // Clear the terminal first
            term.clear();
            
            // Filter and clean the restored data
            let filteredHistory = filterThinkingAnimations(historyToRestore);
            console.log(`  - After filterThinkingAnimations: ${filteredHistory.length}`);
            
            filteredHistory = cleanStatusLines(filteredHistory);
            console.log(`  - After cleanStatusLines: ${filteredHistory.length}`);
            console.log(`  - Final first 200 chars:`, filteredHistory.substring(0, 200));
            
            // Write the restored history
            if (filteredHistory && filteredHistory.trim()) {
              
              // Split into lines and write in chunks to avoid blocking UI thread
              const lines = filteredHistory.split(/\r?\n/);
              
              // 🚀 PERFORMANCE FIX (Nov 19, 2025): Write in chunks to keep UI responsive
              // Writing 10,000+ lines synchronously blocks UI for 40+ seconds
              const CHUNK_SIZE = 100;
              let currentIndex = 0;
              
              const writeChunk = () => {
                const endIndex = Math.min(currentIndex + CHUNK_SIZE, lines.length);
                
                // Write this chunk
                for (let i = currentIndex; i < endIndex; i++) {
                  term.writeln(lines[i]);
                }
                
                currentIndex = endIndex;
                
                // Schedule next chunk if more lines remain
                if (currentIndex < lines.length) {
                  const percentComplete = Math.round((currentIndex / lines.length) * 100);
                  if (percentComplete % 20 === 0) {
                  }
                  setTimeout(writeChunk, 0); // Yield to browser event loop
                } else {
                }
              };
              
              writeChunk(); // Start chunked writing
            } else {
              console.warn(`⚠️ No content to write after filtering!`);
            }
            
            // Add separator to show this was restored
            term.writeln('\r\n' + '='.repeat(50));
            term.writeln(`\r\n✅ Terminal history restored from ${sandboxMode ? 'checkpoint' : 'session'}`);
            term.writeln('\r\n' + '='.repeat(50) + '\r\n');
            
            // 🔧 FIX: Scroll to bottom after restoring terminal history
            // This ensures the input prompt is visible and user can interact immediately
            setTimeout(() => {
              if (term && term.buffer && term.buffer.active) {
                // Scroll the xterm buffer
                term.scrollToBottom();
                
                // Also scroll the container div (which has the 300px padding)
                if (terminalRef.current && terminalRef.current.parentElement) {
                  const container = terminalRef.current.parentElement;
                  container.scrollTop = container.scrollHeight;
                }
                
              }
            }, 200); // Increased timeout to ensure rendering is complete
            
            // 🔒 CRITICAL FIX (Oct 28, 2025): DO NOT clear localStorage after restoration!
            // We need to keep it so users can navigate Timeline -> IDE -> Timeline -> IDE repeatedly
            // The history should persist until explicitly cleared or terminal session ends
          }
        }

        // ENHANCED SCROLL TRACKING: Better user intent detection
        let lastViewportY = 0;
        const checkScrollPosition = () => {
          if (term && term.buffer && term.buffer.active) {
            try {
              const buffer = term.buffer.active;
              const viewportY = buffer.viewportY;
              const baseY = buffer.baseY;
              const linesFromBottom = baseY - viewportY;
              
              // Detect scroll direction and magnitude
              const scrollDelta = viewportY - lastViewportY;
              const isScrollingUp = scrollDelta < 0;
              const isSignificantScroll = Math.abs(scrollDelta) > 3;
              
              // User intentionally scrolled up if:
              // 1. They scrolled up significantly (more than 3 lines)
              // 2. They're more than 10 lines from bottom
              if (isScrollingUp && isSignificantScroll && linesFromBottom > 10) {
                setIsUserScrolled(true);
              } 
              // Reset user scroll if they're back near bottom
              else if (linesFromBottom <= 2) {
                setIsUserScrolled(false);
              }
              // If Claude is active and we're somewhat close, reset user scroll
              else if (claudeActive && linesFromBottom <= 15 && !isScrollingUp) {
                setIsUserScrolled(false);
              }
              
              lastViewportY = viewportY;
            } catch (e) {
              // Silently handle errors
            }
          }
        };
        
        // ⚡ PERFORMANCE FIX (Feb 2, 2025): DISABLED scroll check interval
        // Root cause of progressive lag: This ran every 500ms, accessing term.buffer
        // After 5 mins = 600 executions × buffer access = cumulative lag
        // Scroll detection now handled by scroll events, not polling
        // scrollCheckIntervalRef.current = setInterval(checkScrollPosition, 500);

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
          if (fitAddonRef.current && term) {
            try {
              const beforeBuffer = term.buffer?.active;
              const wasAtBottom = beforeBuffer ? beforeBuffer.viewportY === beforeBuffer.baseY : false;

              // Debounce: only emit after resizes settle (prevents spamming Claude CLI TUI)
              if (resizeDebounceRef.current) {
                clearTimeout(resizeDebounceRef.current);
              }

              resizeDebounceRef.current = setTimeout(() => {
                try {
                  fitAddonRef.current?.fit();

                  // Only emit if dimensions actually changed
                  if (xtermRef.current && socketRef.current?.connected && sessionId) {
                    const { cols, rows } = xtermRef.current;
                    const last = lastResizeDimsRef.current;
                    if (cols > 0 && rows > 0 && (cols !== last.cols || rows !== last.rows)) {
                      lastResizeDimsRef.current = { cols, rows };
                      socketRef.current.emit('terminal:resize', { id: sessionId, cols, rows });
                    }
                  }

                  // Check state after resize
                  const afterBuffer = term.buffer?.active;

                  // If resize broke the viewport sync and we were at bottom, fix it
                  if (wasAtBottom && afterBuffer && afterBuffer.viewportY !== afterBuffer.baseY) {
                    term.scrollLines(afterBuffer.baseY - afterBuffer.viewportY);
                  }

                  // If we were at bottom before resize, ensure we stay at bottom
                  if (wasAtBottom) {
                    setTimeout(() => {
                      term.scrollToBottom();
                    }, 50);
                  }
                } catch (err) {
                  // Defensive: catch stale closure errors during HMR
                }
              }, 150);
            } catch (error) {
              // Silently handle resize errors
            }
          }
        });

        if (terminalRef.current && terminalRef.current.parentElement) {
          resizeObserver.observe(terminalRef.current.parentElement);
        }

        // Return cleanup function
        const cleanup = () => {
          try {
            resizeObserver.disconnect();
            // Clean up scroll monitoring
            if (scrollCheckIntervalRef.current) {
              clearInterval(scrollCheckIntervalRef.current);
              scrollCheckIntervalRef.current = null;
            }
            // Clean up debounce timer
            if (scrollDebounceRef.current) {
              clearTimeout(scrollDebounceRef.current);
              scrollDebounceRef.current = null;
            }
            // Clean up output buffering timers
            if (outputFlushTimeoutRef.current) {
              clearTimeout(outputFlushTimeoutRef.current);
              outputFlushTimeoutRef.current = null;
            }
            if (writeRAFRef.current) {
              cancelAnimationFrame(writeRAFRef.current);
              writeRAFRef.current = null;
            }
            // Clear any pending buffers
            outputBufferRef.current = [];
            rafBatchBufferRef.current = ''; // Clear RAF batch buffer (Feb 2, 2025)
            // Dispose of onData handler
            if (onDataDisposableRef.current) {
              onDataDisposableRef.current.dispose();
              onDataDisposableRef.current = null;
            }
            // Clean up paste event listener
            if (pasteHandlerRef.current) {
              document.removeEventListener('paste', pasteHandlerRef.current, true);
              pasteHandlerRef.current = null;
            }
            if (term) {
              term.dispose();
            }
          } catch (error) {
            // Silently handle cleanup errors
          }
        };

        return cleanup;
        
      } else {
        // REMOVED: // REMOVED: console.log('Terminal container not ready, retrying...');
        // Retry after a short delay if container isn't ready
        setTimeout(() => {
          if (terminalRef.current && !xtermRef.current && terminalRef.current.offsetWidth > 0) {
            term.open(terminalRef.current);
            // Safety check for dimensions
            if (terminalRef.current.offsetWidth > 0 && terminalRef.current.offsetHeight > 0) {
              fitAddon.fit();
            }
            term.focus();
            xtermRef.current = term;
            fitAddonRef.current = fitAddon;
          }
        }, 200);
        }
      } catch (error) {
        console.error('Terminal initialization error:', error);
        // Set up a basic fallback
        if (terminalRef.current) {
          terminalRef.current.innerHTML = '<div style="color: #ff6b6b; padding: 20px;">Terminal initialization failed. Please refresh the page.</div>';
        }
      }
    };

    // Call the async initialization function
    initializeTerminal();
  }, []); // 🔧 FIX (Nov 19, 2025): Run once on mount, polling logic inside handles async ref readiness

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSoundPresetDropdown && 
          soundDropdownRef.current && 
          !soundDropdownRef.current.contains(event.target as Node) &&
          soundButtonRef.current &&
          !soundButtonRef.current.contains(event.target as Node)) {
        setShowSoundPresetDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSoundPresetDropdown]);

  // Load sound preferences
  useEffect(() => {
    setAudioAlertsEnabled(soundAlertService.getEnabled());
    setSelectedSoundPreset(soundAlertService.getPreset());
  }, []);

  // Simplified: No complex positioning - work WITH terminal architecture
  const positionButtonSimply = (fileCount: number) => {
    // No complex calculations - use predictable CSS positioning
    // Button will appear in bottom-right of terminal area, clearly visible
    // Button uses simple CSS positioning - no complex calculations needed
    return; // Simple function - no positioning logic needed
  };
  
  // Listen for Claude files ready event from IDE page (drag-drop files)
  useEffect(() => {
    const handleClaudeFilesReady = (event: CustomEvent) => {
      const { content, fileCount } = event.detail;
      
      if (content && fileCount > 0) {
        setClaudeCopyContent(content);
        setShowClaudeCopyButton(true);
        setCurrentFileCount(fileCount); // Store file count for resize recalculation
        
        // Button will use simple, predictable positioning - no complex calculations needed
        
        // Auto-hide after 30 seconds
        setTimeout(() => {
          setShowClaudeCopyButton(false);
        }, 30000);
      }
    };
    
    window.addEventListener('claudeFilesReady', handleClaudeFilesReady as EventListener);
    
    return () => {
      window.removeEventListener('claudeFilesReady', handleClaudeFilesReady as EventListener);
    };
  }, []);

  // Keep sessionId ref in sync for voice callbacks
  useEffect(() => {
    sessionIdForVoiceRef.current = sessionId;
    // Make session ID globally available for drag-drop when it changes
    if (typeof window !== 'undefined' && sessionId) {
      (window as any).terminalSessionId = sessionId;
    }
    // REMOVED: // REMOVED: console.log('📝 Updated sessionIdForVoiceRef:', sessionId);
  }, [sessionId]);

  // Connect to backend when both terminal and session are ready
  useEffect(() => {
    // Don't connect to backend if in sandbox mode - it's read-only (but allow agent terminals)
    if (sandboxMode && !agentMode) {
      return;
    }
    
    // Agent terminals need backend connection for interactive commands
    if (agentMode) {
    }
    
    // 🔍 DIAGNOSTIC: Log connection check values
    console.log('═══════════════════════════════════════════════════════════');
    console.log('═══════════════════════════════════════════════════════════');
    
    // Connect when terminal is ready (session ID can be created by server if needed)
    // 🔧 FIX (Nov 21, 2025): Skip connectToBackend for agent terminals - they use agent:terminal:connect instead
    // Agent terminals get their output from the CLI puppeteer PTY, not a new bash PTY
    // 🔧 FIX (Dec 2, 2025): EXCEPT Claude tabs - they need their own bash PTY to run the claude CLI
    // Claude tabs have agentMode=true but need a PTY session like regular terminals
    const isClaudeTab = agentMode && agentSession?.name?.startsWith('Claude ');
    if (terminalReady && xtermRef.current && !isConnected && !connectionInProgressRef.current && (!agentMode || isClaudeTab)) {
      connectToBackend(xtermRef.current);
    } else {
    }
    
    // 🎯 CRITICAL FIX (Oct 28, 2025): Cleanup Socket.IO listeners on unmount
    // UPDATED: Use handler refs to remove only THIS component's listeners, not ALL global listeners
    // Previous bug: socket.off('event') removed ALL listeners including ones from new component instances
    // This caused race condition where cleanup removed listeners registered by remounted component
    return () => {
      
      // ⏰ WATCHDOG: Clear timeout on component unmount
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
        console.log('⏰ Connection watchdog cleared (cleanup)');
      }
      
      // Reset connection flag
      connectionInProgressRef.current = false;
      
      // Synchronous cleanup using stored socket ref
      if (socketRef.current) {
        
        // Remove only THIS component's specific handler functions
        if (socketHandlersRef.current.terminalHistory) {
          socketRef.current.off('terminal:history', socketHandlersRef.current.terminalHistory);
        }
        if (socketHandlersRef.current.terminalData) {
          socketRef.current.off('terminal:data', socketHandlersRef.current.terminalData);
        }
        if (socketHandlersRef.current.terminalCommand) {
          socketRef.current.off('terminal:command', socketHandlersRef.current.terminalCommand);
        }
        if (socketHandlersRef.current.terminalCreated) {
          socketRef.current.off('terminal:created', socketHandlersRef.current.terminalCreated);
        }
        if (socketHandlersRef.current.connect) {
          socketRef.current.off('connect', socketHandlersRef.current.connect);
        }
        if (socketHandlersRef.current.disconnect) {
          socketRef.current.off('disconnect', socketHandlersRef.current.disconnect);
        }
        if (socketHandlersRef.current.connectError) {
          socketRef.current.off('connect_error', socketHandlersRef.current.connectError);
        }
        if (socketHandlersRef.current.reconnect) {
          socketRef.current.off('reconnect', socketHandlersRef.current.reconnect);
        }
        if (socketHandlersRef.current.terminalExit) {
          socketRef.current.off('terminal:exit', socketHandlersRef.current.terminalExit);
        }
        // ⚡ PERFORMANCE FIX (Feb 2, 2025): Cleanup accumulating socket handlers
        // These handlers were added in connectToBackend() without cleanup, causing progressive lag
        if (socketHandlersRef.current.terminalCreatedConfirmation) {
          socketRef.current.off('terminal:created', socketHandlersRef.current.terminalCreatedConfirmation);
        }
        if (socketHandlersRef.current.claudeOutput) {
          socketRef.current.off('claude:output', socketHandlersRef.current.claudeOutput);
        }
        if (socketHandlersRef.current.claudeSessionComplete) {
          socketRef.current.off('claude:sessionComplete', socketHandlersRef.current.claudeSessionComplete);
        }
        if (socketHandlersRef.current.claudeError) {
          socketRef.current.off('claude:error', socketHandlersRef.current.claudeError);
        }
        if (socketHandlersRef.current.aiTeamProgress) {
          socketRef.current.off('ai-team:progress', socketHandlersRef.current.aiTeamProgress);
        }
        if (socketHandlersRef.current.aiTeamComplete) {
          socketRef.current.off('ai-team:complete', socketHandlersRef.current.aiTeamComplete);
        }
        if (socketHandlersRef.current.agentSpawn) {
          socketRef.current.off('agent:spawn', socketHandlersRef.current.agentSpawn);
        }
        if (socketHandlersRef.current.agentTerminalCreated) {
          socketRef.current.off('agent:terminal:created', socketHandlersRef.current.agentTerminalCreated);
        }
        // 🔧 FIX #1 (Nov 19, 2025): Removed cleanup for duplicate listener
        // The agentTerminalData listener is now only managed in the useEffect hook
        
        // 🔒 CRITICAL FIX (Nov 18, 2025): Don't disconnect shared socket in component cleanup
        // PROBLEM: Multiple Terminal components (main + agents) share ONE socket via getSocket()
        // When any Terminal unmounts, calling disconnect() kills the socket for ALL terminals
        // This caused immediate disconnection when agent tabs spawned (React remounting components)
        // 
        // SOLUTION: Only remove THIS component's event listeners, keep socket alive
        // Socket lifecycle is managed at app level, not component level
        // Each Terminal safely shares the socket - only their listeners are isolated
        //
        // Previous code (REMOVED):
        // console.log('🔌 Disconnecting socket to trigger server cleanup timer');
        // socketRef.current.disconnect(); // ← This killed shared socket for all terminals!
        
      }
    };
  }, [sessionId, terminalReady, sandboxMode]); // 🔧 FIX (Nov 17, 2025): Removed agentMode and isConnected from deps
  // agentMode: Changing agent mode shouldn't disconnect socket - agent terminals just connect to existing socket
  // isConnected: When isConnected changes from false → true, useEffect was re-running and cleanup would disconnect!
  // 🔧 FIX (Nov 18, 2025): Removed socket.disconnect() call entirely - see comment at line 2079
  // Multiple Terminal instances share one socket - disconnecting in cleanup killed it for everyone

  // Handle terminal dimension recalculation when sandbox mode changes
  useEffect(() => {
    if (fitAddonRef.current && xtermRef.current) {
      // Wait for DOM to update after sandbox button row appears/disappears
      const timer = setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          // Ensure we stay scrolled to bottom after resize
          if (xtermRef.current) {
            xtermRef.current.scrollToBottom();
          }
        } catch (error) {
          console.warn('Terminal fit error after sandbox mode change:', error);
        }
      }, 100); // Allow time for button row to render/remove

      return () => clearTimeout(timer);
    }
  }, [sandboxMode]);

  // 🔧 FIX (Nov 18, 2025): agent:spawn listener is managed in connectToBackend()
  // Previously had duplicate listener here causing race conditions - REMOVED
  // The handler in connectToBackend (line ~4027) properly registers and cleans up

  // 🔧 FIX (Nov 17, 2025): Setup agent terminal connection when agentMode/agentSession changes
  // This connects to the agent's output stream when you click on an agent tab
  const connectedAgentIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  agentMode:', agentMode);
    console.log('  agentSession:', agentSession);
    console.log('  agentSession.id:', agentSession?.id);
    console.log('  agentSession.role:', agentSession?.role);
    console.log('  agentSession.teamId:', agentSession?.teamId);
    console.log('  terminalReady:', terminalReady);
    console.log('  hasXterm:', !!xtermRef.current);
    console.log('═══════════════════════════════════════════════════════');
    
    if (!agentMode || !agentSession) {
      console.log('   agentMode:', agentMode, '(needs to be true)');
      console.log('   agentSession:', agentSession, '(needs to be defined)');
      return;
    }

    // 🔧 FIX (Dec 2, 2025): Claude tabs use regular PTY via connectToBackend(), not agent terminal system
    // Skip agent terminal connection for Claude tabs - they get output via terminal:data not agent:terminal:data
    const isClaudeTab = agentSession.name?.startsWith('Claude ');
    if (isClaudeTab) {
      return;
    }
    
    // 🔧 FIX: Don't check xtermRef.current here - it might not be ready yet
    // Instead, we'll wait for it inside setupAgentTerminalConnection

    // Prevent reconnecting to the same agent session
    if (connectedAgentIdRef.current === agentSession.id) {
      console.log('⏭️  Already connected to agent:', agentSession.id);
      return;
    }

    let handleAgentTerminalData: ((data: { agentId: string; data: string }) => void) | null = null;
    let agentSocketRef: any = null; // Store socket for cleanup
    let retryTimeoutRef: NodeJS.Timeout | null = null; // 🔧 FIX (Nov 21): Store retry timeout for cleanup

    // 🔧 FIX #4 (Nov 19, 2025): Diagnostic function for debugging agent terminal issues
    const logFullDiagnostic = async () => {
      const socket = await getSocket();
      console.log('Agent Mode:', agentMode);
      console.log('Agent Session:', agentSession);
      console.log('Socket Connected:', socket?.connected);
      console.log('Socket ID:', socket?.id);
      console.log('Xterm Initialized:', xtermRef.current !== null);
      console.log('Connected Agent ID Ref:', connectedAgentIdRef.current);
      console.log('Timestamp:', new Date().toISOString());
      console.log('====================================');
    };

    const setupAgentTerminalConnection = async () => {
      const socket = await getSocket();
      agentSocketRef = socket; // 🔧 Store for synchronous cleanup
      
      // 🔧 FIX PART 2 (Nov 23, 2025): Agent terminals don't need xterm to connect
      // CRITICAL: Hidden terminals (display:none) can't initialize xterm until visible
      // BUT they can still receive data and buffer it for later display
      // Skip xterm polling for agent terminals - they'll connect and buffer immediately
      
      let term = xtermRef.current;
      
      // Only wait for xterm for non-agent terminals (regular user terminals)
      if (!agentMode) {
        let attempts = 0;
        console.log('⏳ [AGENT-SETUP] Regular terminal - waiting for xterm, initial value:', !!term);
        while (!term && attempts < 50) { // Wait up to 5 seconds (50 * 100ms)
          await new Promise(resolve => setTimeout(resolve, 100));
          term = xtermRef.current;
          attempts++;
          if (attempts % 10 === 0) {
            console.log(`⏳ [AGENT-SETUP] Still waiting for xterm... attempt ${attempts}/50`);
          }
        }
        
        if (!term) {
          console.error('❌ [AGENT-SETUP] Xterm never became ready after 5 seconds!');
          return;
        }
        
        
        // 🔧 UX (Nov 21, 2025): Show immediate feedback while agent initializes
        term.writeln('\x1b[36m⏳ Agent initializing... Please wait.\x1b[0m');
        term.writeln('\x1b[90m   Claude CLI is starting up. Output will appear shortly.\x1b[0m');
        term.writeln('');
      } else {
        // 🔧 Agent terminal: Connect immediately even if hidden
        // Data will be buffered until terminal becomes visible (Part 3)
        
        // If xterm IS available (terminal is visible), show welcome message
        if (term) {
          console.log('✅ [AGENT-SETUP] Xterm already ready - terminal is visible');
          term.writeln('\x1b[36m⏳ Agent initializing... Please wait.\x1b[0m');
          term.writeln('\x1b[90m   Claude CLI is starting up. Output will appear shortly.\x1b[0m');
          term.writeln('');
        } else {
          console.log('⏳ [AGENT-SETUP] Xterm not ready yet - will show welcome when visible');
        }
      }

      console.log('🤖 Setting up agent terminal connection for:', agentSession.id);
      
      // Run diagnostic after 2 seconds to check final state
      setTimeout(logFullDiagnostic, 2000);

      // 🔧 FIX: Remove previous handler before adding new one (targeted removal)
      // Using socket.off with the handler ref instead of removeAllListeners
      // to avoid removing listeners from other component instances
      if (handleAgentTerminalData) {
        socket.off('agent:terminal:data', handleAgentTerminalData);
      }
      
      // Listen for agent terminal data
      handleAgentTerminalData = ({ agentId, data }: { agentId: string; data: string }) => {
        // 🔧 DIAGNOSTIC LOGGING (Nov 19, 2025)
        console.log('📡 [AGENT-DATA] Received broadcast:');
        console.log('   agentId from broadcast:', agentId);
        console.log('   agentSession.id expected:', agentSession.id);
        console.log('   Match?:', agentId === agentSession.id);
        console.log('   Data length:', data?.length || 0);
        
        // 🔧 FIX PART 3 (Nov 23, 2025): Buffer data if xterm not ready yet
        // Agent terminals start hidden - xterm can't initialize until visible
        // Buffer incoming data and flush it when terminal becomes visible
        if (agentId === agentSession.id) {
          const currentTerm = xtermRef.current;
          
          if (currentTerm) {
            // Xterm is ready - use RAF batching to prevent animation flooding
            console.log('✅ [AGENT-DATA] Xterm ready! Batching', data.length, 'chars with RAF');
            
            // 🚀 TWO-LAYER BATCHING (Nov 26, 2025): Fixes repeating status lines
            // Layer 1: setTimeout(10ms) groups rapid ANSI cursor code chunks
            // Layer 2: RAF batches for 60fps rendering
            // This preserves in-place updates (\x1b[2K\x1b[1A sequences)
            
            // Push to array buffer (preserves chunk order)
            agentOutputBufferRef.current.push(data);
            
            // Clear existing timeout and schedule new flush
            if (agentFlushTimeoutRef.current) {
              clearTimeout(agentFlushTimeoutRef.current);
            }
            agentFlushTimeoutRef.current = setTimeout(flushAgentOutput, 10);
          } else {
            // Xterm not ready - buffer the data
            console.log('⏳ [AGENT-DATA] Xterm not ready, buffering', data.length, 'chars');
            agentDataBufferRef.current += data;
            console.log('   Total buffered:', agentDataBufferRef.current.length, 'chars');
          }
        } else {
          console.warn('❌ [AGENT-DATA] Filter BLOCKED - ID mismatch');
        }
      };

      // Register new listener (only one will exist now due to removeAllListeners above)
      socket.on('agent:terminal:data', handleAgentTerminalData);
      console.log('✅ [AGENT-SETUP] Listener registered for agent:terminal:data, agentSession.id:', agentSession.id);

      // 🔧 FIX (Nov 21, 2025): Add retry logic for agent terminal connection
      // The backend pending queue may not flush properly if sockets disconnect/reconnect
      // This retry ensures we connect once the session actually exists
      let retryCount = 0;
      const maxRetries = 15;
      const retryDelay = 1000;
      let isConnectedToAgent = false;

      const attemptConnect = () => {
        if (isConnectedToAgent) return; // Already connected
        
        if (!socket.connected) {
          console.log('⏳ Socket not connected, waiting...');
          socket.once('connect', attemptConnect);
          return;
        }

        console.log('═══════════════════════════════════════════════════════');
        console.log('   Agent ID:', agentSession.id);
        console.log('   Attempt:', `${retryCount + 1}/${maxRetries}`);
        console.log('   Socket connected:', socket.connected);
        console.log('   Socket ID:', socket.id);
        console.log('═══════════════════════════════════════════════════════');
        socket.emit('agent:terminal:connect', { agentId: agentSession.id });
      };

      // Handle successful connection
      const onConnected = ({ agentId }: { agentId: string }) => {
        if (agentId === agentSession.id) {
          isConnectedToAgent = true;
          if (retryTimeoutRef) clearTimeout(retryTimeoutRef);
        }
      };

      // Handle connection error/pending - retry until session exists
      const onError = ({ agentId, message }: { agentId: string; message: string }) => {
        if (agentId === agentSession.id && !isConnectedToAgent) {
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(`⏳ Agent terminal session not ready, retrying in ${retryDelay}ms... (${retryCount}/${maxRetries}) - ${message}`);
            retryTimeoutRef = setTimeout(attemptConnect, retryDelay);
          } else {
            console.error('❌ Failed to connect to agent terminal after max retries:', agentId);
          }
        }
      };

      // Register response handlers
      socket.on('agent:terminal:connected', onConnected);
      socket.on('agent:terminal:error', onError);
      socket.on('agent:terminal:pending', onError); // Treat pending like error for retry

      attemptConnect();
      connectedAgentIdRef.current = agentSession.id;
    };

    setupAgentTerminalConnection();

    // 🔧 FIX (Nov 19, 2025): Synchronous cleanup to prevent listener leaks
    // CRITICAL: Async cleanup with .then() doesn't complete before re-mount in React Strict Mode
    // Using agentSocketRef instead of getSocket().then() ensures cleanup runs synchronously
    return () => {
      // 🔧 FIX (Nov 21, 2025): Clear retry timeout to prevent orphaned retries
      if (retryTimeoutRef) {
        clearTimeout(retryTimeoutRef);
        retryTimeoutRef = null;
      }
      if (agentSocketRef) {
        if (handleAgentTerminalData) {
          agentSocketRef.off('agent:terminal:data', handleAgentTerminalData);
        }
        // 🔧 FIX (Nov 21, 2025): Clean up retry handlers to prevent memory leaks
        agentSocketRef.off('agent:terminal:connected');
        agentSocketRef.off('agent:terminal:error');
        agentSocketRef.off('agent:terminal:pending');
        connectedAgentIdRef.current = null;
        agentSocketRef = null;
      }
      
      // 🚀 TWO-LAYER CLEANUP (Nov 26, 2025): Cancel both setTimeout and RAF
      if (agentFlushTimeoutRef.current) {
        clearTimeout(agentFlushTimeoutRef.current);
        agentFlushTimeoutRef.current = null;
      }
      if (agentWriteRAFRef.current) {
        cancelAnimationFrame(agentWriteRAFRef.current);
        agentWriteRAFRef.current = null;
      }
      agentOutputBufferRef.current = [];
      agentRafBatchBufferRef.current = '';
    };
  }, [agentMode, agentSession?.id, terminalReady]); // 🔧 FIX: Use terminalReady state instead of xtermRef.current (refs don't trigger re-renders)

  // 🔧 FIX PART 3 (Nov 23, 2025): Flush buffered agent data when terminal becomes visible
  // CRITICAL: Agent terminals start hidden - xterm can't initialize until visible
  // This useEffect watches for xterm becoming ready and flushes any buffered data
  useEffect(() => {
    // Only relevant for agent terminals
    if (!agentMode || !agentSession) {
      return;
    }
    
    const term = xtermRef.current;
    const bufferedData = agentDataBufferRef.current;
    
    // If xterm is now ready AND we have buffered data, flush it
    if (term && bufferedData.length > 0) {
      
      // Show welcome message first (if not already shown)
      term.writeln('\x1b[36m⏳ Agent initializing... Please wait.\x1b[0m');
      term.writeln('\x1b[90m   Claude CLI is starting up. Output will appear shortly.\x1b[0m');
      term.writeln('');
      
      // Write all buffered data
      term.write(bufferedData);
      
      // Clear the buffer
      agentDataBufferRef.current = '';
    } else if (term && bufferedData.length === 0) {
    } else if (!term && bufferedData.length > 0) {
      console.log('⏳ [BUFFER-FLUSH] Data buffered, waiting for xterm... (', bufferedData.length, 'chars buffered)');
    }
  }, [agentMode, agentSession, terminalReady]); // terminalReady changes when xterm initializes

  // Store isConnected in a ref for use in callbacks
  const isConnectedRef = useRef(false);
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  // Auto-focus terminal when component mounts and after interactions
  useEffect(() => {
    // Only focus if this terminal is visible
    if (!isVisible) {
      return;
    }

    // Focus terminal after a short delay to ensure DOM is ready
    const focusTimer = setTimeout(() => {
      if (xtermRef.current && terminalRef.current && isVisible) {
        try {
          xtermRef.current.focus();
        } catch (error) {
          console.warn('Could not auto-focus terminal:', error);
        }
      }
    }, 500);

    // Add global click handler to refocus terminal when clicked anywhere in terminal area
    const handleTerminalAreaClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is within terminal container and terminal is visible
      if (terminalRef.current && terminalRef.current.contains(target) && isVisible) {
        // Notify parent that terminal was clicked (hides hero section)
        onTerminalClick?.();
        
        if (xtermRef.current) {
          try {
            xtermRef.current.focus();
          } catch (error) {
            console.warn('Could not focus terminal on click:', error);
          }
        }
      }
    };

    document.addEventListener('click', handleTerminalAreaClick);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('click', handleTerminalAreaClick);
    };
  }, [terminalReady, isVisible, sessionId, isConnected]);

  // Handle visibility changes - focus when becoming visible
  useEffect(() => {
    if (isVisible && xtermRef.current) {
      // Small delay to ensure DOM updates are complete
      const timer = setTimeout(() => {
        try {
          xtermRef.current?.focus();
        } catch (error) {
          console.warn('Could not focus terminal on visibility change:', error);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, sessionId]);

  // Listen for checkpoint restoration events
  useEffect(() => {
    
    // Debounced handler to prevent rapid-fire restoration attempts
    const debouncedCheckpointRestore = debounce((event: CustomEvent) => {
      
      // For checkpointRestored event: { checkpoint, snapshot }
      const snapshot = event.detail?.snapshot;
      const terminalData = snapshot?.terminal;
      const conversationHistory = snapshot?.conversationHistory;
      
      if (!xtermRef.current) {
        return;
      }
      
      // Clear current terminal
      xtermRef.current.clear();
      
      // ENHANCED: Display conversation history first if available
      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        
        // Display conversation history header
        xtermRef.current.write('\r\n\x1b[38;5;174m══════════════════════════════════════════════════════════════════════════════════════════════════════════\x1b[0m\r\n');
        xtermRef.current.write('\x1b[38;5;174m📂 Session restored from checkpoint\x1b[0m\r\n');
        xtermRef.current.write('\x1b[38;5;174m══════════════════════════════════════════════════════════════════════════════════════════════════════════\x1b[0m\r\n\r\n');
        
        // Display each conversation
        conversationHistory.forEach((conversation: any, index: number) => {
          if (conversation.user_input && conversation.claude_reply) {
            // User input
            xtermRef.current?.write(`\x1b[38;5;147m💬 You:\x1b[0m ${conversation.user_input}\r\n\r\n`);
            
            // Claude response (truncated for readability)
            const response = conversation.claude_reply.length > 500 
              ? conversation.claude_reply.substring(0, 500) + '...'
              : conversation.claude_reply;
            xtermRef.current?.write(`\x1b[38;5;174m🤖 Claude:\x1b[0m ${response}\r\n\r\n`);
            
            if (index < conversationHistory.length - 1) {
              xtermRef.current?.write('\x1b[38;5;244m────────────────────────────────────────────────────────────────────────────────────────────────────────\x1b[0m\r\n\r\n');
            }
          }
        });
        
        xtermRef.current.write('\x1b[38;5;174m══════════════════════════════════════════════════════════════════════════════════════════════════════════\x1b[0m\r\n');
        xtermRef.current.write('\x1b[38;5;147m📅 Continuing from where you left off...\x1b[0m\r\n');
        xtermRef.current.write('\x1b[38;5;174m══════════════════════════════════════════════════════════════════════════════════════════════════════════\x1b[0m\r\n\r\n');
      }
      
      // Restore current terminal session (if available)
      if (terminalData && typeof terminalData === 'string') {
        
        // 🚨 DIAGNOSTIC: Log raw terminal data before filtering
        
        const rawPlanModeCount = (terminalData.match(/plan mode on/gi) || []).length;
        const rawPauseCount = (terminalData.match(/⏸/g) || []).length;
        const rawShiftTabCount = (terminalData.match(/shift\+tab/gi) || []).length;
        
        console.log('  ⏸ Pause symbol occurrences:', rawPauseCount);
        
        if (rawPlanModeCount > 10) {
          const lines = terminalData.split('\n');
          const planModeLines = lines.filter(line => line.toLowerCase().includes('plan mode on'));
          planModeLines.slice(0, 3).forEach((line, i) => {
            console.log(`    ${i + 1}. "${line.substring(0, 100)}${line.length > 100 ? '...' : ''}"`);
          });
        }
        
        // Filter out thinking animations before writing
        let filteredData = filterThinkingAnimations(terminalData);
        filteredData = cleanStatusLines(filteredData);  // Layer 3 defense
        
        // 🚨 DIAGNOSTIC: Compare before and after filtering
        const filteredPlanModeCount = (filteredData.match(/plan mode on/gi) || []).length;
        const filteredPauseCount = (filteredData.match(/⏸/g) || []).length;
        const filteredShiftTabCount = (filteredData.match(/shift\+tab/gi) || []).length;
        
        console.log('  ⏸ Pause symbols: ', rawPauseCount, '→', filteredPauseCount, '(', rawPauseCount - filteredPauseCount, 'symbols removed)');
        
        if (filteredPlanModeCount > 0) {
          const filteredLines = filteredData.split('\n');
          const remainingPlanModeLines = filteredLines.filter(line => line.toLowerCase().includes('plan mode on'));
          remainingPlanModeLines.slice(0, 3).forEach((line, i) => {
            console.log(`    ${i + 1}. "${line.substring(0, 100)}${line.length > 100 ? '...' : ''}"`);
          });
        } else {
        }
        
        
        // Write the filtered terminal string
        xtermRef.current.write(filteredData);
        
      } else {
        // Start fresh Claude CLI session
        xtermRef.current.write('Terminal ready. Type \x1b[38;5;174mclaude\x1b[0m to start a new session.\r\n\r\n');
      }
      
      // Add a separator to show where restoration ends
      xtermRef.current.writeln('\r\n' + '='.repeat(50));
      xtermRef.current.writeln('📂 Session restored from checkpoint');
      xtermRef.current.writeln('='.repeat(50) + '\r\n');
      
      // Ensure terminal is scrolled to bottom and properly fitted after restoration
      setTimeout(() => {
        if (xtermRef.current) {
          xtermRef.current.focus();
          // Scroll to bottom to show all restored content
          xtermRef.current.scrollToBottom();
          // Fit the terminal viewport with safety check
          if (fitAddonRef.current && terminalRef.current && 
              terminalRef.current.offsetWidth > 0 && terminalRef.current.offsetHeight > 0) {
            fitAddonRef.current.fit();
          }
        }
      }, 200);
      
      // ENHANCED: Reconnect to backend after checkpoint restoration with better session management
      // WITHOUT THIS: the terminal displays content but cannot accept keyboard input
      // CRITICAL FIX: Only run enhanced reconnection for sandbox terminals, NOT main terminals
      // Main terminals should maintain their existing connection to prevent focus/input issues
      if (sandboxMode) {
        // Check if Claude is already active - don't reinitialize if it is
        if (claudeActive) {
          console.log('ℹ️ Terminal: Claude already active, skipping reconnection');
          setTimeout(() => {
            if (xtermRef.current) {
              xtermRef.current.focus();
            }
          }, 200);
          return;
        }
        
        setTimeout(async () => {
          
          // Clear any old session references that might cause conflicts
          const oldSessionId = sessionIdForVoiceRef.current || sessionId;
          if (oldSessionId) {
            // Add to failed cleanup list to prevent cleanup attempts
            failedCleanupSessionsRef.current.add(oldSessionId);
          }
          
          // Always create a fresh session after checkpoint restoration
          try {
            const response = await fetch('/api/terminal-rest/sessions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cols: 130, rows: 30 })
            });
            
            if (response.ok) {
              const data = await response.json();
              const newSessionId = data.sessionId;
              
              
              // Update all session references
              setSessionId(newSessionId);
              sessionIdForVoiceRef.current = newSessionId;
              setTerminalReady(true);
              
              
              // Only connect if we have a valid terminal instance and haven't connected already
              if (xtermRef.current && (!socketRef.current?.connected || !onDataDisposableRef.current)) {
                
                await connectToBackend(xtermRef.current);
                
              } else {
                console.log('ℹ️ TERMINAL DIAGNOSTIC: Skipping connection - already connected or terminal not ready');
              }
            } else {
              console.error('❌ Terminal: Failed to create session, status:', response.status);
              const errorText = await response.text();
              console.error('❌ Terminal: Session creation error:', errorText);
            }
          } catch (error) {
            console.error('❌ Terminal: Network error creating session after restoration:', error);
          }
          
          // Ensure terminal has focus for immediate typing
          setTimeout(() => {
            if (xtermRef.current) {
              xtermRef.current.focus();
            }
          }, 500);
        }, 300); // Small delay to ensure terminal content is rendered first
      } else {
        // Main terminal - just ensure focus, don't disrupt existing connection
        // Also check if Claude is already active to prevent reinitializing
        if (claudeActive) {
          console.log('ℹ️ Main terminal: Claude already active, preserving session');
        }
        setTimeout(() => {
          if (xtermRef.current) {
            xtermRef.current.focus();
          }
        }, 500);
      }
    }, 300); // 300ms debounce delay to prevent rapid-fire restoration
    
    // Wrapper to handle the event listener properly
    const handleCheckpointRestored = (event: CustomEvent) => {
      // 🚨 CRITICAL FIX: Only sandbox terminals should handle checkpoint restoration events
      // Main terminal should ignore these events to prevent content duplication
      if (!sandboxMode) {
        return;
      }
      debouncedCheckpointRestore(event);
    };
    
    const handleIdeStateChanged = (event: CustomEvent) => {
      if (event.detail?.type === 'checkpoint-restored') {
        // 🚨 CRITICAL FIX: Only sandbox terminals should handle checkpoint IDE state changes
        if (!sandboxMode) {
          return;
        }
        
        // For ideStateChanged: event.detail.data IS the snapshot
        const terminalData = event.detail?.data?.terminal;
        
        if (!terminalData || typeof terminalData !== 'string') {
          return;
        }
        
        if (!xtermRef.current) {
          return;
        }
        
        // Clear and restore terminal
        xtermRef.current.clear();
        // Filter out thinking animations before writing
        let filteredData = filterThinkingAnimations(terminalData);
        filteredData = cleanStatusLines(filteredData);  // Layer 3 defense
        xtermRef.current.write(filteredData);
        
        // Add separator
        xtermRef.current.writeln('\r\n' + '='.repeat(50));
        xtermRef.current.writeln('📂 Session restored from checkpoint');
        xtermRef.current.writeln('='.repeat(50) + '\r\n');
        
        // Focus terminal
        setTimeout(() => {
          if (xtermRef.current) {
            xtermRef.current.focus();
          }
        }, 100);
      }
    };
    
    // Listen for both possible events
    // Removed handleInjectHistory - Copy to Main functionality removed to prevent server crashes
    // Users should manually copy/paste instead
    
    // Handle sandbox command injection
    const handleInjectCommand = (event: CustomEvent) => {
      const { command } = event.detail;
      if (command && xtermRef.current && !sandboxMode && socketRef.current?.connected) {
        
        // Inject the command into the terminal as if the user typed it
        xtermRef.current.write('\r\n\x1b[38;5;214m🎯 Executing extracted command:\x1b[0m\r\n');
        xtermRef.current.write('$ ' + command + '\r\n');
        
        // Send the command to the backend
        socketRef.current.emit('terminal:input', {
          id: sessionId,
          data: command + '\r',
          selectedClaudeModel,
          skipPermissions: terminalSettings.skipPermissions
        });
      }
    };
    
    // 🔧 FIX (Dec 14, 2025): Handler to refocus terminal after checkpoint modal closes or sandbox restore
    const handleTerminalRefocus = () => {
      // For sandbox/agent terminals, only focus if they are visible
      // This allows timeline restore to focus the sandbox terminal
      if ((sandboxMode || agentMode) && !isVisible) {
        return;
      }

      if (xtermRef.current && isVisible) {
        setTimeout(() => {
          try {
            xtermRef.current?.focus();
          } catch (error) {
            console.warn('Could not refocus terminal:', error);
          }
        }, 50);
      }
    };

    // Remove any existing listeners first to prevent duplicates
    window.removeEventListener('checkpointRestored', handleCheckpointRestored as any);
    window.removeEventListener('ideStateChanged', handleIdeStateChanged as any);
    window.removeEventListener('terminal:injectCommand', handleInjectCommand as any);
    window.removeEventListener('terminal:refocus', handleTerminalRefocus);

    // Add fresh listeners
    window.addEventListener('checkpointRestored', handleCheckpointRestored as any);
    window.addEventListener('ideStateChanged', handleIdeStateChanged as any);
    window.addEventListener('terminal:injectCommand', handleInjectCommand as any);
    window.addEventListener('terminal:refocus', handleTerminalRefocus);

    return () => {
      window.removeEventListener('checkpointRestored', handleCheckpointRestored as any);
      window.removeEventListener('ideStateChanged', handleIdeStateChanged as any);
      window.removeEventListener('terminal:injectCommand', handleInjectCommand as any);
      window.removeEventListener('terminal:refocus', handleTerminalRefocus);
    };
  }, [sessionId, sandboxMode, agentMode, isVisible]); // Added dependencies for new handler

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false; // Changed to false for better control
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      recognitionInstance.maxAlternatives = 1;
      
      recognitionInstance.onresult = async (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result && result[0] && result[0].transcript) {
            const transcript = result[0].transcript;
            if (result.isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
        }
        
        // Show interim results as user speaks (but don't spam the terminal)
        if (interimTranscript && xtermRef.current) {
          // REMOVED: // REMOVED: console.log('Interim transcript:', interimTranscript);
          // Only show interim feedback in console, not in terminal to avoid spam
          // xtermRef.current.write(`\r\n💬 Hearing: "${interimTranscript}"`);
        }
        
        if (finalTranscript && finalTranscript.trim()) {
          // Clean up the transcript
          const cleanTranscript = finalTranscript.trim();
          // REMOVED: // REMOVED: console.log('Final speech recognized:', cleanTranscript);
          
          // Clear interim feedback and show final (minimal UI feedback)
          if (xtermRef.current) {
            // Minimal feedback - just show that voice was recognized
            // // xtermRef.current.writeln(`\r\n🎤 Voice: ${cleanTranscript}`); // REMOVED: Voice status message
            
            // Check if it's a Claude activation command
            if (cleanTranscript.toLowerCase().includes('claude')) {
              xtermRef.current.writeln('🤖 Claude mode activated');
              setClaudeActive(true);
              setConversationMode(true);
              
              // Activate supervision
              if (!isSupervisionActive) {
                enableSupervision();
              }
            }
            
            // Don&apos;t write to terminal UI directly - let the backend handle it
            // The text will appear when the backend processes it
            
            // Get the socket from the global socket service
            const socket = await getSocket();
            const currentSessionId = sessionIdForVoiceRef.current;
            
            // REMOVED: console.log('🎤 Voice input debug:', {
            //   sessionIdFromRef: currentSessionId,
            //   sessionIdFromState: sessionId,
            //   socketConnected: socket?.connected,
            //   transcript: cleanTranscript
            // });
            
            // Send to backend if we have a valid session
            if (socket && socket.connected && currentSessionId && !currentSessionId.startsWith('simulated-')) {
              // REMOVED: console.log('✅ Sending voice input to real session:', currentSessionId);

              // Send as a single message (not character by character)
              socket.emit('terminal:input', {
                id: currentSessionId,
                data: cleanTranscript,
                selectedClaudeModel: useModelStore.getState().selectedModel,
                skipPermissions: terminalSettings.skipPermissions
              });
              
              // Auto-execute for Claude commands
              if (cleanTranscript.toLowerCase().includes('claude')) {
                xtermRef.current.write('\r\n');
                socket.emit('terminal:input', {
                  id: currentSessionId,
                  data: '\r',
                  selectedClaudeModel: useModelStore.getState().selectedModel,
                  skipPermissions: terminalSettings.skipPermissions
                });
              }
            } else {
              // logger?.warn('Cannot send voice input to backend:', {
              //   socketConnected: socket?.connected,
              //   sessionId: currentSessionId
              // });
              
              // Still show in terminal UI
              if (cleanTranscript.toLowerCase().includes('claude')) {
                xtermRef.current.write('\r\n');
              }
            }
            
            // Update current command buffer
            setCurrentCommand(prev => prev + cleanTranscript);
          }
        }
      };
      
      recognitionInstance.onerror = (event: any) => {
        // logger?.error('Speech recognition error:', event.error);
        setVoiceListening(false);
        if (xtermRef.current) {
          let errorMessage = '';
          switch (event.error) {
            case 'not-allowed':
              errorMessage = 'Microphone permission denied. Please allow microphone access.';
              break;
            case 'no-speech':
              errorMessage = 'No speech detected. Try speaking more clearly.';
              break;
            case 'audio-capture':
              errorMessage = 'No microphone found or audio capture failed.';
              break;
            case 'network':
              errorMessage = 'Network error occurred during speech recognition.';
              break;
            case 'service-not-allowed':
              errorMessage = 'Speech recognition service not allowed. Try using HTTPS.';
              break;
            case 'bad-grammar':
              errorMessage = 'Speech recognition grammar error.';
              break;
            default:
              errorMessage = `Speech recognition error: ${event.error}`;
          }
          // xtermRef.current.writeln(`\r\n❌ ${errorMessage}`);
        }
      };
      
      recognitionInstance.onend = () => {
        // Auto-restart recognition if user is still in voice mode
        if (voiceListening && recognitionInstance) {
          try {
            setTimeout(() => {
              if (voiceListening) {
                recognitionInstance.start();
              }
            }, 100); // Small delay before restarting
          } catch (error) {
            // REMOVED: // REMOVED: console.log('Auto-restart failed:', error);
            setVoiceListening(false);
            if (xtermRef.current) {
              // xtermRef.current.writeln('\r\n🎤 Voice input ended');
            }
          }
        } else {
          setVoiceListening(false);
          if (xtermRef.current) {
            // xtermRef.current.writeln('\r\n🎤 Voice input ended');
          }
        }
      };
      
      setRecognition(recognitionInstance);
    } else {
      // logger?.warn('Speech recognition not supported in this browser');
    }
  }, []);

  // Emergency stop all AI Team agents (Nov 26, 2025)
  const handleEmergencyStop = async () => {
    const confirmed = window.confirm(
      `Stop all ${activeAgentCount} running agents?\n\nThis will terminate all Claude CLI processes immediately.\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    setIsStoppingAgents(true);
    
    try {
      const res = await fetch('/api/puppet-bridge/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'User emergency stop from terminal' })
      });
      
      if (res.ok) {
        setActiveAgentCount(0);
      } else {
        console.error('❌ Emergency stop failed');
      }
    } catch (error) {
      console.error('❌ Emergency stop error:', error);
    } finally {
      setIsStoppingAgents(false);
    }
  };

  const toggleVoiceRecognition = async () => {
    if (!recognition) {
      xtermRef.current?.writeln('\r\n❌ Speech recognition not supported in this browser');
      // xtermRef.current?.writeln('Try using Chrome, Edge, or Safari for speech recognition');
      return;
    }
    
    if (voiceListening) {
      recognition.stop();
      setVoiceListening(false);
      // xtermRef.current?.writeln('\r\n🎤 Voice input stopped');
    } else {
      try {
        // Request microphone permission first
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            // xtermRef.current?.writeln('\r\n🎤 Microphone access granted');
          } catch (permError) {
            xtermRef.current?.writeln('\r\n❌ Microphone permission denied');
            // xtermRef.current?.writeln('Please allow microphone access to use speech-to-text');
            return;
          }
        }
        
        // Check if we're on HTTPS (required for speech recognition in many browsers)
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
          xtermRef.current?.writeln('\r\n⚠️ Speech recognition may require HTTPS');
        }
        
        recognition.start();
        setVoiceListening(true);
        // xtermRef.current?.writeln('\r\n🎤 Voice input started - speak now...');
        // xtermRef.current?.writeln('Say your commands clearly. Speech will be converted to text.');
      } catch (error) {
        // logger?.error('Failed to start speech recognition:', error);
        setVoiceListening(false);
        // xtermRef.current?.writeln('\r\n❌ Failed to start voice input');
        xtermRef.current?.writeln(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  // Input buffer for when socket is reconnecting (moved to component scope)
  const inputBufferRef = useRef<string[]>([]);
  const isProcessingBufferRef = useRef(false);
  
  // Function to flush agent output with two-layer batching (Nov 26, 2025)
  const flushAgentOutput = useCallback(() => {
    const term = xtermRef.current;
    if (!term || agentOutputBufferRef.current.length === 0) return;
    
    // Layer 1: Join array chunks (preserves order from setTimeout grouping)
    const output = agentOutputBufferRef.current.join('');
    agentOutputBufferRef.current = [];
    
    // Layer 2: RAF batch for 60fps rendering (groups multiple flushes)
    agentRafBatchBufferRef.current += output;
    
    if (!agentWriteRAFRef.current) {
      agentWriteRAFRef.current = requestAnimationFrame(() => {
        if (term && agentRafBatchBufferRef.current) {
          term.write(agentRafBatchBufferRef.current);
          agentRafBatchBufferRef.current = '';
        }
        agentWriteRAFRef.current = null;
      });
    }
    
    agentFlushTimeoutRef.current = null;
  }, []);
  
  // Function to process buffered input (moved to component scope)
  const processInputBuffer = useCallback(() => {
    const socket = socketRef.current;
    const currentSessionId = sessionIdForVoiceRef.current || sessionId;
    
    if (!isProcessingBufferRef.current && inputBufferRef.current.length > 0 && socket?.connected && currentSessionId) {
      isProcessingBufferRef.current = true;
      while (inputBufferRef.current.length > 0) {
        const bufferedData = inputBufferRef.current.shift();
        if (bufferedData) {
          socket.emit('terminal:input', {
            id: currentSessionId,
            data: bufferedData,
            selectedClaudeModel: useModelStore.getState().selectedModel,
            skipPermissions: terminalSettings.skipPermissions
          });
        }
      }
      isProcessingBufferRef.current = false;
    }
  }, [sessionId]);

  const connectToBackend = async (term: XTerm) => {
    // REMOVED: // REMOVED: console.log('🔌 CONNECTING TO BACKEND:', { sessionId, terminalReady });
    
    // Prevent concurrent connections
    if (connectionInProgressRef.current) {
      // REMOVED: // REMOVED: console.log('⚠️ Connection already in progress, skipping...');
      return;
    }
    
    // Allow connection even without sessionId (server will generate one)
    if (!terminalReady) {
      return;
    }
    
    // If we have a session ID, validate it
    if (sessionId && !validateCurrentSession()) {
      // Don't return - continue and let server generate a new session
    }
    
    // Mark connection as in progress
    connectionInProgressRef.current = true;

    // ⏰ WATCHDOG: Auto-reset connection flag after 10 seconds if connection doesn't complete
    // This prevents permanent blocking when connection fails silently
    connectionTimeoutRef.current = setTimeout(() => {
      if (connectionInProgressRef.current) {
        console.error('🚨 Connection timeout after 10s - resetting flag');
        console.error('   This usually means connection failed silently or got stuck');
        connectionInProgressRef.current = false;
        setIsConnected(false);
      }
    }, 10000);
    console.log('⏰ Connection watchdog started (10s timeout)');

    // Get Socket.IO instance to connect to Express backend
    // REMOVED: // REMOVED: console.log('🔧 Getting Socket.IO instance...');
    const socket = await getSocket();
    // REMOVED: // REMOVED: console.log('✅ Socket.IO instance obtained:', socket.connected ? 'CONNECTED' : 'DISCONNECTED');
    socketRef.current = socket;
    
    // Make socket globally available for file drop functionality
    if (typeof window !== 'undefined') {
      (window as any).terminalSocket = socket;
    }
    
    // Critical diagnostic: Check if we're using mock socket
    if (socket?.io?.engine?.transport?.name === 'mock' || socket?.id === 'mock-socket') {
      console.error('❌ CRITICAL: Terminal requires unified server mode!');
      console.error('====================================================');
      console.error('PROBLEM: You are using the wrong development server mode.');
      console.error('');
      console.error('SOLUTION: Stop the server and restart with:');
      console.error('  npm run dev');
      console.error('');
      console.error('DO NOT USE: npm run dev:legacy');
      console.error('');
      console.error('The unified server provides Socket.IO for terminal support.');
      console.error('See DEVELOPMENT.md for more information.');
      console.error('====================================================');
      
      // Visual warning for users
      if (xtermRef.current) {
        xtermRef.current.writeln('\x1b[31m⚠️ ERROR: Wrong server mode - Terminal disabled\x1b[0m');
        xtermRef.current.writeln('');
        xtermRef.current.writeln('\x1b[33mYou are using legacy mode which has no Socket.IO support.\x1b[0m');
        xtermRef.current.writeln('');
        xtermRef.current.writeln('To fix: Stop the server and run:');
        xtermRef.current.writeln('\x1b[36m  npm run dev\x1b[0m');
        xtermRef.current.writeln('');
        xtermRef.current.writeln('See DEVELOPMENT.md for details.');
      }
    } else {
    }
    
    // Focus terminal immediately when backend is connected
    const focusOnConnect = () => {
      if (term && !term.element?.contains(document.activeElement)) {
        setTimeout(() => {
          try {
            term.focus();
          } catch (error) {
            console.warn('Could not focus terminal after connection:', error);
          }
        }, 100);
      }
    };

    // Add connection status listeners for debugging
    // Remove existing listener using specific handler ref
    const connectHandler = () => {
      // REMOVED: // REMOVED: console.log('🟢 Socket.IO CONNECTED to backend');
      // If we have a session ID, always ensure terminal session is active
      // 🔧 FIX (Jan 31, 2026): Removed isConnected check.
      // On rapid refresh/transport close, isConnected is false, but we MUST re-emit terminal:create
      // because the buffered initial emit might have been lost on the failed transport.
      if (sessionId) {
        setRestorationState('restoring'); // Show loading overlay
        const dims = xtermRef.current ? { cols: xtermRef.current.cols, rows: xtermRef.current.rows } : {};
        socket.emit('terminal:create', { id: sessionId, ...dims });
        focusOnConnect();
      }
    };
    if (socketHandlersRef.current.connect) {
      socket.off('connect', socketHandlersRef.current.connect);
    }
    socketHandlersRef.current.connect = connectHandler;
    socket.on('connect', connectHandler);
    
    // Handle terminal created response from server
    // Remove existing listener using specific handler ref
    const terminalCreatedHandler = ({ sessionId: serverSessionId, pid }: { sessionId: string; pid: number }) => {
      
      // Check if this is a NEW terminal or a RECONNECTION
      const isNewTerminal = !sessionId || sessionId === 'undefined' || sessionId === 'null';
      
      // If we didn't have a session ID, use the one from the server
      if (isNewTerminal) {
        setSessionId(serverSessionId);
        sessionIdForVoiceRef.current = serverSessionId;
        
        // Reset token counter for new terminal sessions
        const store = useIDEStore.getState();
        store.resetTokenUsage();
        
        // New sessions don't need restoration wait time
        setRestorationState('hidden');
      }
      
      // 🎯 CRITICAL FIX (Jan 31, 2026): Clear connection watchdog on success
      // Without this, the 10s timeout triggers even if connection succeeded!
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      connectionInProgressRef.current = false;
      setIsConnected(true);
      
      // 🎯 CRITICAL FIX (Oct 28, 2025): Only scroll to top for NEW terminals
      // Don't scroll to top when reconnecting because history restoration handles scrolling
      // Previous bug: Aggressive scroll-to-top was fighting with history restoration scroll-to-bottom
      if (isNewTerminal) {
        // 🔧 FIX: Aggressively scroll to TOP multiple times to ensure header stays visible
        // Use the same aggressive multi-method scrolling as Claude Code mode
        const scrollToTop = () => {
          if (term) {
            try {
              // Method 1: XTerm scroll to line 0
              term.scrollToLine(0);
              
              // Method 2: Container-level scroll
              const terminalContainer = terminalRef.current?.parentElement;
              if (terminalContainer) {
                terminalContainer.scrollTop = 0;
              }
              
              // Method 3: Force viewport scroll
              const terminalElement = terminalRef.current;
              if (terminalElement) {
                const viewport = terminalElement.querySelector('.xterm-viewport');
                if (viewport) {
                  viewport.scrollTop = 0;
                }
              }
              
            } catch (e) {
              console.warn('Scroll to top failed:', e);
            }
          }
        };
        
        // Scroll to top repeatedly during initial load period
        // This fights against any other code trying to scroll to bottom
        [100, 500, 1000, 1500, 2000, 2500].forEach(delay => {
          setTimeout(scrollToTop, delay);
        });
        
        // Enable normal auto-scroll after 3 seconds
        setTimeout(() => {
          initialLoadComplete.current = true;
        }, 3000);
      } else {
        // For reconnections, enable auto-scroll immediately
        initialLoadComplete.current = true;
      }
    };
    if (socketHandlersRef.current.terminalCreated) {
      socket.off('terminal:created', socketHandlersRef.current.terminalCreated);
    }
    socketHandlersRef.current.terminalCreated = terminalCreatedHandler;
    socket.on('terminal:created', terminalCreatedHandler);
    
    // Handle disconnect
    const disconnectHandler = (reason: string) => {
      
      // ADDED: Immediate feedback - show "Reconnecting" overlay instead of confusing error text
      // This unifies the UX: Reconnecting -> Restoring -> Connected
      if (reason !== 'io client disconnect') {
        setRestorationState('reconnecting');
      }
      
      // ADDED: Track disconnect for session resurrection
      setIsConnected(false);
    };
    if (socketHandlersRef.current.disconnect) {
      socket.off('disconnect', socketHandlersRef.current.disconnect);
    }
    socketHandlersRef.current.disconnect = disconnectHandler;
    socket.on('disconnect', disconnectHandler);
    
    // Handle connection errors
    const connectErrorHandler = (error: Error) => {
      console.error('❌ Socket.IO CONNECTION ERROR:', {
        message: error.message,
        sessionId,
        timestamp: new Date().toISOString()
      });
      
      if (term) {
        term.writeln(`\r\n❌ Connection error: ${error.message}`);
      }
      
      // 🔧 FIX (Jan 31, 2026): Hide overlay on error so user can see the error message
      setRestorationState('hidden');
    };
    if (socketHandlersRef.current.connectError) {
      socket.off('connect_error', socketHandlersRef.current.connectError);
    }
    socketHandlersRef.current.connectError = connectErrorHandler;
    socket.on('connect_error', connectErrorHandler);
    
    // ADDED: Reconnection success handler with session resurrection
    const reconnectHandler = (attemptNumber: number) => {
      
      setIsConnected(true);
      
      if (term) {
        term.writeln('\r\n✅ Connection restored');
        
        // ADDED: Re-establish terminal session after reconnection
        if (sessionId && sessionId !== 'undefined' && sessionId !== 'null') {
          setRestorationState('restoring'); // Transition to restoration phase
          const dims = xtermRef.current ? { cols: xtermRef.current.cols, rows: xtermRef.current.rows } : {};
          socket.emit('terminal:create', { id: sessionId, ...dims });
        }
      }
    };
    if (socketHandlersRef.current.reconnect) {
      socket.off('reconnect', socketHandlersRef.current.reconnect);
    }
    socketHandlersRef.current.reconnect = reconnectHandler;
    socket.on('reconnect', reconnectHandler);

    // 🎯 CRITICAL FIX (Oct 28, 2025): Register terminal:history listener BEFORE emitting terminal:create
    // Race condition: Server emits history immediately upon terminal:create, must listen first!
    // UPDATED: Store handler in ref so cleanup can remove only THIS component's listener
    const terminalHistoryHandler = ({ id, history, chunkCount }: { id: string; history: string; chunkCount: number }) => {
      // 🚨 DIAGNOSTIC LOGGING - Race Condition & Session ID Debugging
      const timestamp = new Date().toISOString();
      const clientSessionId = sessionIdForVoiceRef.current;
      const sessionMatch = id === clientSessionId;
      
      console.log('═══════════════════════════════════════════════════════');
      devLog('🔍 [CLIENT] terminal:history EVENT RECEIVED');
      console.log(`⏰ Timestamp: ${timestamp}`);
      console.log('═══════════════════════════════════════════════════════');
      
      if (!sessionMatch) {
        console.error('🚨 SESSION ID MISMATCH - Event will be ignored!');
        console.error(`Expected: ${clientSessionId}`);
        console.error(`Received: ${id}`);
        return; // Don't process mismatched sessions
      }
      
      if (id === sessionIdForVoiceRef.current && term) {
        
        // 🔧 CRITICAL FIX (Oct 29, 2025): Different filtering for reconnection vs checkpoint viewing
        // Two scenarios require different filtering levels:
        // 1. Timeline → Back to IDE (reconnection): Show FULL conversation including Claude responses
        // 2. Checkpoint viewing (sandboxMode): Show CLEAN terminal without status lines/animations
        let cleanedHistory = history;
        
        if (sandboxMode) {
          // Scenario 2: Viewing checkpoint/summary - apply FULL aggressive filtering
          cleanedHistory = filterThinkingAnimations(history);
          cleanedHistory = cleanStatusLines(cleanedHistory);
        } else {
          // Scenario 1: Reconnection to live session - apply MINIMAL filtering only
          // Only remove codes that corrupt display, keep all conversation content
        }
        
        // 🔒 CRITICAL FIX (Oct 28, 2025): Strip focus codes that corrupt terminal display
        // Focus codes like \x1b[I and \x1b[O at the start of restored history corrupt the display
        
        // Restoration complete!
        setRestorationState('hidden');
        // These codes cause Claude to show internal commands instead of proper welcome message
        cleanedHistory = cleanedHistory.replace(/\x1b\[I/g, '').replace(/\x1b\[O/g, '');
        
        // 🔒 Remove bracketed paste mode codes (safe to remove in both scenarios)
        cleanedHistory = cleanedHistory.replace(/\[200~/g, '');
        cleanedHistory = cleanedHistory.replace(/\[201~/g, '');
        
        // 🔒 CRITICAL FIX (Oct 28, 2025): Remove old reconnection warnings from restored history
        // These warnings were written during previous navigation attempts and should not be restored
        cleanedHistory = cleanedHistory
          .split('\n')
          .filter(line => !line.includes('Connection lost. Reconnecting'))
          .join('\n');
        
        
        // 🎯 CRITICAL FIX (Oct 28, 2025): Always restore history when reconnecting to existing session
        // The key insight: If we're receiving terminal:history event, it means we're RECONNECTING
        // to an existing session that was preserved during navigation (Timeline → IDE)
        // We should ALWAYS restore that history to show the user their previous work
        
        const hasCleanedHistory = cleanedHistory && cleanedHistory.trim();
        
        
        const shouldRestoreHistory = hasCleanedHistory;
        
        if (shouldRestoreHistory) {
          // 🔒 CRITICAL FIX (Oct 28, 2025): Save to localStorage so it persists on navigation!
          // This was the missing piece - we receive history from server but never save it to localStorage
          // 
          // 🛟 RECOVERY FIX (Nov 19, 2025): Don't overwrite checkpoint recovery data!
          // If recovery data exists in localStorage (454KB+), preserve it instead of overwriting with 10-char prompt
          if (typeof window !== 'undefined') {
            const storageKey = sandboxMode && sandboxSession 
              ? `sandboxTerminalHistory_${sandboxSession.id}`
              : 'mainTerminalHistory';
            
            const existingHistory = localStorage.getItem(storageKey);
            const existingLength = existingHistory?.length || 0;
            
            // Only save if we have MORE data than what's already stored
            // This prevents overwriting large checkpoint data (454KB) with small prompts (10 chars)
            if (cleanedHistory.length > existingLength) {
              localStorage.setItem(storageKey, cleanedHistory);
            } else {
            }
          }
          
          // Clear terminal before writing history
          term.clear();
          term.write(cleanedHistory);
          term.write('\r\n\r\n');
          term.write('\x1b[38;5;174m' + '═'.repeat(80) + '\x1b[0m\r\n');
          term.write('\x1b[38;5;174m✅ Terminal history restored from session\x1b[0m\r\n');
          term.write('\x1b[38;5;174m' + '═'.repeat(80) + '\x1b[0m\r\n');
          term.write('\r\n');
          
          // Scroll to bottom
          setTimeout(() => {
            if (term && term.buffer && term.buffer.active) {
              const totalRows = term.buffer.active.length;
              const viewportRows = term.rows;
              const maxScrollback = term.options.scrollback || 1000;
              const scrollPosition = Math.max(0, totalRows - viewportRows);
              
              if (term.scrollToLine) {
                term.scrollToLine(scrollPosition);
              } else if (term.scrollToBottom) {
                term.scrollToBottom();
              }
              
            }
          }, 200);
        } else {
        }
      }
    };
    
    // Remove old listener using specific handler ref (not global socket.off!)
    if (socketHandlersRef.current.terminalHistory) {
      socket.off('terminal:history', socketHandlersRef.current.terminalHistory);
    }
    
    // Store new handler in ref for cleanup
    socketHandlersRef.current.terminalHistory = terminalHistoryHandler;
    
    // 🚨 DIAGNOSTIC LOGGING - Event Listener Registration
    console.log('═══════════════════════════════════════════════════════');
    devLog('🎯 [CLIENT] Registering terminal:history event listener');
    console.log(`🆔 For session ID: "${sessionIdForVoiceRef.current}"`);
    console.log(`⏰ Registration time: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════');
    
    // Register new listener
    socket.on('terminal:history', terminalHistoryHandler);
    
    devLog('✅ [CLIENT] terminal:history listener registered');

    // Join the terminal session
    // 🚨 DIAGNOSTIC LOGGING - terminal:create Emission
    console.log('═══════════════════════════════════════════════════════');
    devLog('📤 [CLIENT] About to emit terminal:create');
    console.log(`🆔 Session ID: "${sessionId}"`);
    console.log(`⏰ Emission time: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════');
    
    // Critical fix: Don't send undefined or null as the session ID
    // Let the server generate one if we don't have a valid ID
    const dims = xtermRef.current ? { cols: xtermRef.current.cols, rows: xtermRef.current.rows } : {};
    if (sessionId && sessionId !== 'undefined' && sessionId !== 'null') {
      socket.emit('terminal:create', { id: sessionId, ...dims });
      devLog('✅ [CLIENT] terminal:create emitted with session ID');
    } else {
      devLog('⚠️ No valid session ID, letting server generate one');
      socket.emit('terminal:create', { ...dims }); // Let server generate ID
      devLog('✅ [CLIENT] terminal:create emitted (server will generate ID)');
    }

    // Flush buffered output to terminal (performance optimization)
    const flushOutput = () => {
      // 🔍 PERFORMANCE DIAGNOSTIC (Added for lag investigation)
      const flushStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
      
      if (outputBufferRef.current.length > 0 && term) {
        const output = outputBufferRef.current.join('');
        outputBufferRef.current = [];
        
        // ⚡ PERFORMANCE FIX (Feb 2, 2025): RAF batching to reduce expensive term.write() calls
        // On large buffers (800+ lines), term.write() takes 50-100ms per call
        // Batching at 60fps (16ms) reduces writes from N per keystroke to 1 per frame
        rafBatchBufferRef.current += output;
        
        if (!writeRAFRef.current) {
          writeRAFRef.current = requestAnimationFrame(() => {
            if (term && rafBatchBufferRef.current) {
              const writeStart = performance.now();
              term.write(rafBatchBufferRef.current);
              const writeEnd = performance.now();
              
              // Diagnostic: warn if write is slow (helps identify performance issues)
              if (writeEnd - writeStart > 20) {
                console.warn(`⚠️ Slow term.write: ${(writeEnd - writeStart).toFixed(2)}ms for ${rafBatchBufferRef.current.length} chars on ${term.buffer?.active?.length || 0} line buffer`);
              }
              
              rafBatchBufferRef.current = '';
            }
            writeRAFRef.current = null;
          });
        }
        
        // 🔒 CRITICAL FIX (Oct 28, 2025): Save terminal content to localStorage incrementally
        // ⚡ PERFORMANCE FIX (Feb 1, 2025): Only save after 3 seconds idle to prevent lag during typing
        // 🐛 BUG FIX (Feb 1, 2025): Calculate idle time BEFORE updating lastFlushTimeRef
        // This ensures history persists even if navigation happens mid-conversation
        const now = Date.now();
        const timeSinceLastFlush = now - lastFlushTimeRef.current;
        
        if (typeof window !== 'undefined' && term.buffer && term.buffer.active && timeSinceLastFlush >= 3000) {
          try {
            const storageKey = sandboxMode && sandboxSession 
              ? `sandboxTerminalHistory_${sandboxSession.id}`
              : 'mainTerminalHistory';
            
            // Get current terminal buffer content
            const buffer = term.buffer.active;
            const lines: string[] = [];
            for (let i = 0; i < buffer.length; i++) {
              const line = buffer.getLine(i);
              if (line) {
                lines.push(line.translateToString(true));
              }
            }
            const currentContent = lines.join('\n');
            
            // Save to localStorage (only during 3s+ idle periods)
            if (currentContent && currentContent.length > 10) {
              localStorage.setItem(storageKey, currentContent);
              lastLocalStorageSaveRef.current = now;
              perfLog(`💾 [INCREMENTAL SAVE] Saved ${currentContent.length} chars to ${storageKey}`);
            }
          } catch (e) {
            console.error('❌ Failed to save terminal history:', e);
          }
        }
        
        // Track flush time for idle detection (AFTER checking idle state)
        lastFlushTimeRef.current = Date.now();
        
        // 🔧 FIX: Skip auto-scroll during initial load to keep header visible
        if (!initialLoadComplete.current) {
          // Initial load - don't auto-scroll, let header remain visible
          return;
        }
        
        // ENHANCED Auto-scroll for Claude Code accessibility - AGGRESSIVE scrolling during active sessions
        // ⚡ PERFORMANCE FIX (Feb 1, 2025): Only run expensive scroll logic when buffer grows
        // ⚡ PERFORMANCE FIX (Feb 2, 2025): Skip scroll logic entirely for keystroke echoes (data.length <= 10)
        // 🔧 FIX (Dec 4, 2025): Only auto-scroll if user is near bottom - allow free scrolling during output
        if (claudeActive && lastDataSizeRef.current > 10) {
          const currentBufferLength = term.buffer?.active?.length || 0;
          const bufferGrew = currentBufferLength > lastBufferLengthRef.current;
          lastBufferLengthRef.current = currentBufferLength;

          // Check if user is near the bottom before auto-scrolling
          // This allows users to scroll up and stay there during Claude output
          const viewport = terminalRef.current?.querySelector('.xterm-viewport') as HTMLElement;
          const isNearBottom = viewport
            ? (viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100)
            : true; // Default to auto-scroll if we can't check

          // Only do aggressive scrolling when new content is added AND user is near bottom
          if (bufferGrew && isNearBottom) {
            // ⚡ PERFORMANCE FIX (Feb 2, 2025): Use RAF instead of 4 setTimeout calls
            // Previous: Created 200+ pending timers during long Claude responses
            // Result: Event loop blocked, causing input lag after 5+ questions
            // Solution: Single RAF synced with browser paint, no timer accumulation
            requestAnimationFrame(() => {
              if (term && claudeActive) {
                try {
                  // Scroll terminal to bottom
                  term.scrollToBottom();

                  // Scroll container (critical for Claude Code prompt access)
                  const terminalContainer = terminalRef.current?.parentElement;
                  if (terminalContainer) {
                    terminalContainer.scrollTop = terminalContainer.scrollHeight;
                  }

                  // Force viewport scroll for deep content
                  const terminalElement = terminalRef.current;
                  if (terminalElement) {
                    const vp = terminalElement.querySelector('.xterm-viewport');
                    if (vp) {
                      (vp as HTMLElement).scrollTop = (vp as HTMLElement).scrollHeight;
                    }
                  }
                } catch (e) {
                  console.warn('RAF scroll failed:', e);
                }
              }
            });
          }
          // If user scrolled away (not near bottom), don't auto-scroll - let them read
        } else {
          // Smart auto-scroll logic for non-Claude sessions
          if (term.buffer && term.buffer.active) {
            const buffer = term.buffer.active;
            const viewportY = buffer.viewportY;
            const baseY = buffer.baseY;
            
            // Calculate how far from bottom (in lines)
            const linesFromBottom = baseY - viewportY;
            
            // Smart auto-scroll conditions (less aggressive):
            // 1. If exactly at bottom
            // 2. If within 2 lines of bottom (very close)
            const shouldAutoScroll = 
              viewportY === baseY || // Exactly at bottom
              linesFromBottom <= 2; // Within 2 lines (very close)
            
            if (shouldAutoScroll) {
              term.scrollToBottom();
              // Reset user scroll flag only if we're at the very bottom
              if (isUserScrolled && linesFromBottom <= 1) {
                setIsUserScrolled(false);
              }
            }
          }
        }
      }
      
      // 🔍 PERFORMANCE DIAGNOSTIC: Log flush timing
      const flushDuration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - flushStart;
      if (flushDuration > 5) {
        console.warn(`⚠️ Slow flush detected: ${flushDuration.toFixed(2)}ms (buffer size: ${term?.buffer?.active?.length || 0} lines)`);
      }
      
      outputFlushTimeoutRef.current = null;
    };

    // 🧠 CONTEXTUAL MEMORY FIX: Handle commands from server for contextual memory
    // ⚡ FIX (Feb 2, 2025): Renamed to avoid shadowing imported terminalCommandHandler singleton
    const terminalCommandSocketHandler = ({ id, command }: { id: string; command: string }) => {
      if (id === sessionIdForVoiceRef.current) {
        if (onTerminalCommand) {
          onTerminalCommand(command);
        } else {
          console.warn('⚠️ [CLIENT] onTerminalCommand callback not available');
        }
      }
    };
    if (socketHandlersRef.current.terminalCommand) {
      socket.off('terminal:command', socketHandlersRef.current.terminalCommand);
    }
    socketHandlersRef.current.terminalCommand = terminalCommandSocketHandler;
    socket.on('terminal:command', terminalCommandSocketHandler);

    // NOTE: terminal:history listener registered earlier (before socket.emit) to avoid race condition
    
    // Handle terminal output from backend
    const terminalDataHandler = ({ id, data }: { id: string; data: string }) => {
      // Use the ref which gets updated immediately when session is created
      if (id === sessionIdForVoiceRef.current && term) {
        // 🔧 FIX (Feb 1, 2025): Deduplicate rapid duplicate data packets
        // Prevents repeating status lines when socket sends same data multiple times
        // ONLY dedupe large chunks (>50 chars) to avoid breaking backspace/cursor movements
        const now = Date.now();
        if (data.length > 50 && lastDataRef.current && 
            lastDataRef.current.data === data && 
            (now - lastDataRef.current.timestamp) < 50) {
          // Same large data chunk within 50ms - likely duplicate, skip it
          return;
        }
        if (data.length > 50) {
          lastDataRef.current = { data, timestamp: now };
        }
        
        // Buffer the output for performance
        outputBufferRef.current.push(data);
        lastDataSizeRef.current = data.length; // Track chunk size for scroll optimization (Feb 2, 2025)
        
        // GLM Integration: Check for rate limit indicators
        // ⚡ PERFORMANCE FIX (Feb 1, 2025): Skip expensive rate limit detection for small data chunks
        const rateLimitEvent = data.length > 20 
          ? rateLimitDetectorRef.current.detectRateLimit(data)
          : { detected: false, reason: '', timestamp: new Date(), suggestGLM: false, severity: 'warning' as const };
        if (rateLimitEvent.detected && rateLimitEvent.suggestGLM) {
          // Show toast with action buttons (using ToastAction interface)
          const cooldownMinutes = rateLimitDetectorRef.current.estimateCooldownMinutes();
          addToast({
            id: `rate-limit-${Date.now()}`,
            message: `⚠️ ${rateLimitEvent.reason}. Switch to cost-effective GLM 4 Flash?`,
            type: rateLimitEvent.severity === 'error' ? 'error' : 'warning',
            duration: 15000,
            dismissible: true,
            actions: [
              {
                label: 'Switch to GLM',
                onClick: async () => {
                  const success = await modeManagerRef.current.switchToGLM(
                    term,
                    {
                      notifyUser: (msg) => term.writeln('\r\n' + msg),
                      maxContextLines: 200
                    }
                  );
                  
                  if (success) {
                    addToast({
                      message: '✅ Switched to GLM 4 Flash. Context preserved!',
                      type: 'success',
                      duration: 5000
                    });
                    
                    // Schedule auto-switch back after cooldown
                    modeManagerRef.current.scheduleAutoSwitchBack(
                      cooldownMinutes,
                      () => {
                        addToast({
                          message: `⏰ Claude cooldown complete (${cooldownMinutes} min). Ready to switch back?`,
                          type: 'info',
                          duration: 10000,
                          actions: [
                            {
                              label: 'Switch to Claude',
                              onClick: async () => {
                                await modeManagerRef.current.switchToClaude({
                                  notifyUser: (msg) => term.writeln('\r\n' + msg)
                                });
                                addToast({
                                  message: '✅ Switched back to Claude CLI',
                                  type: 'success',
                                  duration: 3000
                                });
                              },
                              style: 'primary'
                            }
                          ]
                        });
                      }
                    );
                  }
                },
                style: 'primary'
              },
              {
                label: `Wait ${cooldownMinutes} min`,
                onClick: () => {
                  addToast({
                    message: `⏳ Waiting for Claude cooldown (~${cooldownMinutes} minutes)`,
                    type: 'info',
                    duration: 3000
                  });
                },
                style: 'secondary'
              }
            ]
          });
        }
        
        // Cancel any pending flush
        if (outputFlushTimeoutRef.current) {
          clearTimeout(outputFlushTimeoutRef.current);
        }
        
        // Detect Claude activity based on output patterns
        // Claude outputs typically have certain patterns or continuous streams
        // Skip expensive pattern matching for single characters (keystroke echoes)
        if (data.length > 3 && (data.includes('```') || data.includes('I\'ll') || data.includes('Let me') || data.includes('I can') || data.includes('Here'))) {
          // ⚡ PERFORMANCE FIX (Feb 2, 2025): Only call setState ONCE per Claude response
          // Previous: Called 50-100 times during response → 50-100 React re-renders
          // Result: Progressive lag as component tree complexity grows
          // Solution: Track if we already started, only setState on first detection
          if (!claudeActivityStartedRef.current) {
            setClaudeActive(true);
            claudeActivityStartedRef.current = true;
          }
          
          // 🔧 FIX (Feb 1, 2025): Auto-reset claudeActive after Claude finishes responding
          // Clear any existing timeout and set a new one
          if (claudeActivityTimeoutRef.current) {
            clearTimeout(claudeActivityTimeoutRef.current);
          }
          claudeActivityTimeoutRef.current = setTimeout(() => {
            setClaudeActive(false);
            claudeActivityStartedRef.current = false; // Reset for next response
          }, 3000); // Reset after 3 seconds of no Claude output
          
          // ⚡ PERFORMANCE FIX (Feb 2, 2025): Removed store.updateTokenUsage() from hot path
          // This was triggering Zustand subscribers 50-100 times per response
          // Moved to outside this conditional block (Nov 22, 2025)
        }
        
        // ✅ TOKEN PARSING (Nov 22, 2025): Parse token usage from ALL terminal output
        // Must be OUTSIDE the Claude activity detection block to catch all token displays
        if (data.length > 10) { // Skip tiny fragments
          const tokenUpdate = parseClaudeTokenUsage(data);
          if (tokenUpdate) {
            const store = useIDEStore.getState();
            store.updateTokenUsage(tokenUpdate);
          }
        }
        
        // Simplified flush: Always flush quickly for responsiveness
        // ⚡ PERFORMANCE FIX (Feb 1, 2025): Instant flush for single chars, 10ms for batching larger chunks
        const flushDelay = data.length <= 3 ? 0 : 10;
        outputFlushTimeoutRef.current = setTimeout(flushOutput, flushDelay);
        
        // Check if we should display statusline after command completion
        if (terminalSettings.statusLine.enabled && data.includes('\n')) {
          // Check for command prompt pattern (indicates command completed)
          if (data.match(/\$\s*$/) || data.match(/>\s*$/) || data.match(/#\s*$/) || data.match(/❯\s*$/)) {
            // Generate and display statusline
            const width = term.cols || 80;
            const separator = '─'.repeat(width);
            
            // Line 1: Session info and tokens
            const sessionInfo = `Session: ${sessionId?.slice(-8) || 'none'} | Tokens: ${totalTokens || 0} | Cost: ${usageCost} | Reset: ${blockResetTime}`;
            const model = 'claude-3-5-sonnet';
            const line1 = `${sessionInfo}${' '.repeat(Math.max(0, width - sessionInfo.length - model.length))}${model}`;
            
            // Line 2: Current file and git info
            const currentFileDisplay = currentFile || 'No file open';
            const gitBranch = 'main'; // TODO: Get from git status
            const line2 = `File: ${currentFileDisplay} | Branch: ${gitBranch}`;
            
            // Line 3: Status and model
            const modelDisplay = selectedClaudeModel.includes('opus-4-6') ? 'Opus 4.6' :
                                selectedClaudeModel.includes('4-5-sonnet') ? 'Sonnet 4.5' :
                                selectedClaudeModel.includes('4-sonnet') ? 'Sonnet 4.0' :
                                selectedClaudeModel.includes('3-7-sonnet') ? 'Sonnet 3.7' :
                                selectedClaudeModel.includes('3-5-sonnet') ? 'Sonnet 3.5' :
                                selectedClaudeModel.includes('3-5-haiku') ? 'Haiku 3.5' :
                                selectedClaudeModel.includes('sonnet') ? 'Sonnet' : 
                                selectedClaudeModel.includes('opus') ? 'Opus' : 
                                selectedClaudeModel.includes('haiku') ? 'Haiku' : 'Claude';
            const mode = `Model: ${modelDisplay}`;
            const status = agentsRunning ? 'AI Team Active' : claudeActive ? 'Claude Active' : 'Ready';
            const mcpInfo = mcpStatus.total > 0 ? ` | MCP: ${mcpStatus.healthy}/${mcpStatus.total} ` : '';
            const line3 = `${mode} | ${status}${mcpInfo}`;
            
            // Write the statusline
            term.write('\r\n' + separator);
            term.write('\r\n' + line1);
            term.write('\r\n' + line2);
            term.write('\r\n' + line3);
            term.write('\r\n' + separator + '\r\n');
          }
        }
        
        // Capture terminal output for session tracking
        if (onTerminalData) {
          onTerminalData(data);
        }

        // 🚀 LIVE PREVIEW (Dec 4, 2025): Dispatch event for preview panel to detect dev server
        // This enables Emergent-style live preview when npm run dev starts
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('terminalOutput', {
            detail: { output: data }
          }));
        }

        // Check for Claude activation in output
        if (data.includes('Claude conversation mode') || data.includes('Claude>')) {
          // REMOVED: // REMOVED: console.log('🤖 CLAUDE ACTIVATED');
          setClaudeActive(true);
          setConversationMode(true);
        }
        
        // Track current file for status line
        // Simple pattern matching for common file operations
        const lines = data.split('\n');
        for (const line of lines) {
          // Look for editor commands with file names
          const editorMatch = line.match(/(?:code|vim|nano|edit)\s+([^\s]+\.[a-zA-Z0-9]+)/);
          if (editorMatch) {
            setCurrentFile(editorMatch[1]);
          }
          // Look for cd commands to track current directory
          const cdMatch = line.match(/cd\s+([^\s]+)/);
          if (cdMatch && !cdMatch[1].startsWith('-')) {
            // Reset file when changing directories
            setCurrentFile(null);
          }
        }
        
        // Check for errors to trigger Error Doctor
        if (data.includes('error') || data.includes('Error') || data.includes('failed') || data.includes('command not found') || data.includes('No such file') || data.includes('permission denied') || data.includes('cannot find module') || data.includes('Permission denied')) {
          
          // Clean the error data by removing ANSI escape codes
          const cleanedData = data.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim();
          
          setLastError(cleanedData);
          setHasActiveError(true);
          setErrorHistory(prev => [...prev.slice(-9), cleanedData]); // Keep last 10 errors
        }
      }
    };
    if (socketHandlersRef.current.terminalData) {
      socket.off('terminal:data', socketHandlersRef.current.terminalData);
    }
    socketHandlersRef.current.terminalData = terminalDataHandler;
    socket.on('terminal:data', terminalDataHandler);

    // Handle terminal creation confirmation (connection-specific logic)
    // ⚡ PERFORMANCE FIX (Feb 2, 2025): Convert to named handler with socketHandlersRef storage
    // Previous: Anonymous handler accumulated on every connectToBackend() call
    // Result: 5 reconnections = 5x duplicate handlers = progressive lag
    const terminalCreatedConfirmationHandler = ({ id }: { id: string }) => {
      if (id === sessionId) {
        // REMOVED: // REMOVED: console.log('✅ Terminal connected to Express backend');
        setIsConnected(true);
        
        // 🚨 CRITICAL FIX: Only restore sandbox history if terminal is actually visible
        // This prevents sandbox content from appearing in main terminal during cleanup
        if (sandboxMode && sandboxSession && term && isVisible) {
          // Check if this is an agent terminal (Phase 2)
          const isAgentTerminal = !!(sandboxSession.checkpointData?.role || sandboxSession.checkpointData?.teamId);
          
          if (isAgentTerminal) {
            
            // Connect to agent terminal session via WebSocket
            socket.emit('agent:terminal:connect', {
              agentId: sandboxSession.id
            });
            
            // Listen for agent terminal data
            const handleAgentData = ({ agentId, data }: { agentId: string; data: string }) => {
              if (agentId === sandboxSession.id && term) {
                // 🚀 TWO-LAYER BATCHING (Nov 26, 2025): Fixes repeating status lines
                // Layer 1: setTimeout(10ms) groups rapid ANSI cursor code chunks
                // Layer 2: RAF batches for 60fps rendering
                
                // Push to array buffer (preserves chunk order)
                agentOutputBufferRef.current.push(data);
                
                // Clear existing timeout and schedule new flush
                if (agentFlushTimeoutRef.current) {
                  clearTimeout(agentFlushTimeoutRef.current);
                }
                agentFlushTimeoutRef.current = setTimeout(flushAgentOutput, 10);
              }
            };
            
            socket.on('agent:terminal:data', handleAgentData);
            
            // Clean up listener on unmount
            return () => {
              socket.off('agent:terminal:data', handleAgentData);
              
              // 🚀 TWO-LAYER CLEANUP (Nov 26, 2025): Cancel both setTimeout and RAF
              if (agentFlushTimeoutRef.current) {
                clearTimeout(agentFlushTimeoutRef.current);
                agentFlushTimeoutRef.current = null;
              }
              if (agentWriteRAFRef.current) {
                cancelAnimationFrame(agentWriteRAFRef.current);
                agentWriteRAFRef.current = null;
              }
              agentOutputBufferRef.current = [];
              agentRafBatchBufferRef.current = '';
            };
          } else if (sandboxSession.terminalHistory) {
            // Regular sandbox mode - restore history
            
            // Write the historical terminal content
            // Use the same comprehensive cleaning as initial sandbox setup to remove Claude thinking animations
            let cleanedHistory = filterThinkingAnimations(sandboxSession.terminalHistory);
            cleanedHistory = cleanStatusLines(cleanedHistory);  // Layer 3 defense
            
            // Write the history
            term.write(cleanedHistory);
            
            // Add a separator to show where history ends and new session begins
            term.write('\r\n\r\n');
            term.write('\x1b[38;5;174m══════════════════════════════════════════════════════════════════════════════\x1b[0m\r\n');
            term.write('\x1b[38;5;174m📂 Checkpoint restored - Continue from here\x1b[0m\r\n');
            term.write('\x1b[38;5;174m══════════════════════════════════════════════════════════════════════════════\x1b[0m\r\n');
            term.write('\r\n');
          }
        } else if (!sandboxMode && term) {
          // Check for restored history from checkpoint restore (timeline page)
          if (restoredHistory && restoredHistory.trim() && isVisible) {
            console.log('  - Original length:', restoredHistory.length);
            console.log('  - First 200 chars:', restoredHistory.substring(0, 200));
            
            // Use the same comprehensive cleaning as sandbox restore
            let cleanedHistory = filterThinkingAnimations(restoredHistory);
            console.log('  - After filterThinkingAnimations:', cleanedHistory.length);
            
            cleanedHistory = cleanStatusLines(cleanedHistory);
            console.log('  - After cleanStatusLines:', cleanedHistory.length);
            console.log('  - Final first 200 chars:', cleanedHistory.substring(0, 200));
            
            // Write the history if there's anything left after filtering
            if (cleanedHistory && cleanedHistory.trim()) {
              term.write(cleanedHistory);
              term.write('\r\n\r\n');
            } else {
              console.warn('⚠️ No content left after filtering - history was entirely removed');
            }
            
            // Add a separator to show where history ends
            term.write('\x1b[38;5;174m══════════════════════════════════════════════════════════════════════════════\x1b[0m\r\n');
            term.write('\x1b[38;5;174m✅ Terminal history restored from session\x1b[0m\r\n');
            term.write('\x1b[38;5;174m══════════════════════════════════════════════════════════════════════════════\x1b[0m\r\n');
            term.write('\r\n');
          } else {
            // Normal mode - just show connection message
            term.write('\r\n✅ Connected to backend terminal\r\n');
            
            // 🔧 FIX (Jan 31, 2026): Ensure overlay is hidden even if no history to restore
            setRestorationState('hidden');
          }
        }
        connectionInProgressRef.current = false; // Connection complete
        
        // ⏰ WATCHDOG: Clear timeout on successful connection
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
          console.log('⏰ Connection watchdog cleared (success)');
        }
        
        // Focus terminal after successful connection
        focusOnConnect();
        
        // Send initial resize — fit first so dims reflect actual container size
        if (fitAddonRef.current && xtermRef.current) {
          fitAddonRef.current.fit();
          const { cols, rows } = xtermRef.current;
          socket.emit('terminal:resize', { id: sessionId, cols, rows });
        }
        
        // Process any buffered input after connection
        if (typeof processInputBuffer === 'function') {
          processInputBuffer();
        }
      }
    };
    if (socketHandlersRef.current.terminalCreatedConfirmation) {
      socket.off('terminal:created', socketHandlersRef.current.terminalCreatedConfirmation);
    }
    socketHandlersRef.current.terminalCreatedConfirmation = terminalCreatedConfirmationHandler;
    socket.on('terminal:created', terminalCreatedConfirmationHandler);

    // 🔧 FIX #2B (Nov 19, 2025): REMOVED DUPLICATE LISTENER (SOURCE #2)
    // This was creating ANOTHER agent:terminal:data listener in connectToBackend
    // The agent:terminal:data listener is properly handled in the useEffect hook at lines 2145-2220
    // Having TWO listeners causes MaxListenersExceededWarning and socket churn
    // Handle agent terminal data (for live agent mode, not sandbox) - REMOVED
    if (agentMode && agentSession && term) {
      // 🔧 Agent terminal connection is now handled by dedicated useEffect (lines 2145-2220)
      // This prevents duplicate event listeners and socket instability
      // The useEffect handles both the listener setup AND the agent:terminal:connect emission
    }

    // Handle errors
    const terminalErrorHandler = ({ message }: { message: string }) => {
      // logger?.error('Terminal error:', message);
      term.writeln(`\r\n❌ Terminal error: ${message}`);
      setIsConnected(false);
      connectionInProgressRef.current = false; // Connection failed

      // 🔧 FIX (Jan 31, 2026): Hide overlay on terminal error (e.g. memory pressure)
      // Otherwise the "Restoring Session" spinner blocks the error message
      setRestorationState('hidden');

      // ⏰ WATCHDOG: Clear timeout on connection error
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
        console.log('⏰ Connection watchdog cleared (error)');
      }

      // 🔧 AUTO-RECONNECT (Feb 2026): Create fresh session when server reports session not found
      // Handles: server restarts, PTY exits, stale localStorage session IDs
      if (message.toLowerCase().includes('session not found') && !reconnectInProgressRef.current) {
        reconnectInProgressRef.current = true;
        term.writeln('\r\n🔄 Reconnecting...');
        localStorage.removeItem('ide-terminalSessionId');

        fetch('/api/terminal-rest/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cols: 130, rows: 30 }),
        })
          .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then(data => {
            if (data.sessionId) {
              setSessionId(data.sessionId);
              sessionIdForVoiceRef.current = data.sessionId;
              localStorage.setItem('ide-terminalSessionId', data.sessionId);
              if (typeof window !== 'undefined') {
                (window as any).terminalSessionId = data.sessionId;
              }
              const restoreDims = xtermRef.current ? { cols: xtermRef.current.cols, rows: xtermRef.current.rows } : {};
              socket.emit('terminal:create', { id: data.sessionId, ...restoreDims });
              term.writeln('✅ Session restored.\r\n');
            }
          })
          .catch(err => {
            console.error('[Terminal] Auto-reconnect failed:', err);
            term.writeln('\r\n❌ Reconnect failed. Please refresh the page.');
          })
          .finally(() => {
            reconnectInProgressRef.current = false;
          });
      }
    };
    if (socketHandlersRef.current.terminalExit) {
      socket.off('terminal:error', socketHandlersRef.current.terminalExit);
    }
    socketHandlersRef.current.terminalExit = terminalErrorHandler;
    socket.on('terminal:error', terminalErrorHandler);

    // Handle Claude session events
    // ⚡ PERFORMANCE FIX (Feb 2, 2025): Convert to named handler with socketHandlersRef storage
    const claudeOutputHandler = ({ sessionId: claudeSessionId, data }: { sessionId: string; data: string }) => {
      if (term) {
        term.write(data);
      }
    };
    if (socketHandlersRef.current.claudeOutput) {
      socket.off('claude:output', socketHandlersRef.current.claudeOutput);
    }
    socketHandlersRef.current.claudeOutput = claudeOutputHandler;
    socket.on('claude:output', claudeOutputHandler);

    // ⚡ PERFORMANCE FIX (Feb 2, 2025): Convert to named handler with socketHandlersRef storage
    const claudeSessionCompleteHandler = ({ sessionId: claudeSessionId, duration }: { sessionId: string; duration: number }) => {
      if (term) {
        term.writeln(`\r\n✅ Claude session completed in ${(duration / 1000).toFixed(2)}s`);
        
        // Debug logging for audio alert decision
        
        // Play sound alert if enabled and duration > 20s
        if (audioAlertsEnabled && duration > 20000) {
          soundAlertService.playCompletionAlert().then(() => {
          }).catch((error) => {
            console.warn('🔇 Failed to play completion alert:', error);
          });
        } else {
          if (!audioAlertsEnabled) {
          }
          if (duration <= 20000) {
          }
        }
      }
      setClaudeActive(false);
      setConversationMode(false);
    };
    if (socketHandlersRef.current.claudeSessionComplete) {
      socket.off('claude:sessionComplete', socketHandlersRef.current.claudeSessionComplete);
    }
    socketHandlersRef.current.claudeSessionComplete = claudeSessionCompleteHandler;
    socket.on('claude:sessionComplete', claudeSessionCompleteHandler);

    // Time Capsule: Listen for commit detection during active Claude sessions
    if (features().timeCapsules) {
      const timeCapsuleHandler = (data: { sessionId: string; sha: string; branch: string; message: string; duration: number; claudeSessionStart?: string; repoPath?: string }) => {
        setTimeCapsuleCommit(data);
      };
      if ((socketHandlersRef.current as any).timeCapsuleCommit) {
        socket.off('time_capsule:commit_detected', (socketHandlersRef.current as any).timeCapsuleCommit);
      }
      (socketHandlersRef.current as any).timeCapsuleCommit = timeCapsuleHandler;
      socket.on('time_capsule:commit_detected', timeCapsuleHandler);
    }

    // ⚡ PERFORMANCE FIX (Feb 2, 2025): Convert to named handler with socketHandlersRef storage
    const claudeErrorHandler = ({ message }: { message: string }) => {
      if (term) {
        term.writeln(`\r\n❌ Claude Error: ${message}`);
      }
    };
    if (socketHandlersRef.current.claudeError) {
      socket.off('claude:error', socketHandlersRef.current.claudeError);
    }
    socketHandlersRef.current.claudeError = claudeErrorHandler;
    socket.on('claude:error', claudeErrorHandler);

    // 🔧 FIX (Feb 11, 2026): Sync terminal dimensions when Claude enters interactive mode
    // Root cause: Claude PTY starts with default 120x30 before actual size is communicated
    // Solution: Send resize immediately when interactive session starts
    const claudeModeChangedHandler = (data: { sessionId: string; mode: string }) => {
      // Only handle events for this terminal session
      if (data.sessionId !== sessionIdForVoiceRef.current) return;

      // When Claude enters interactive mode, immediately sync terminal dimensions
      if (data.mode === 'interactive' && fitAddonRef.current && xtermRef.current) {
        // Small delay to ensure bridge PTY is ready to receive resize
        setTimeout(() => {
          if (fitAddonRef.current && xtermRef.current) {
            fitAddonRef.current.fit();
            const { cols, rows } = xtermRef.current;
            if (cols > 0 && rows > 0) {
              socket.emit('terminal:resize', { id: data.sessionId, cols, rows });
              console.log(`[Terminal] Synced dimensions for Claude interactive: ${cols}x${rows}`);
            }
          }
        }, 100);
      }
    };
    if ((socketHandlersRef.current as any).claudeModeChanged) {
      socket.off('claude:mode:changed', (socketHandlersRef.current as any).claudeModeChanged);
    }
    (socketHandlersRef.current as any).claudeModeChanged = claudeModeChangedHandler;
    socket.on('claude:mode:changed', claudeModeChangedHandler);

    // Handle AI Team progress updates
    // ⚡ PERFORMANCE FIX (Feb 2, 2025): Convert to named handler with socketHandlersRef storage
    const aiTeamProgressHandler = (data: any) => {
      if (term && data.agent) {
        // Clear current line and write progress update
        term.write('\r\x1b[K'); // Clear current line
        term.writeln(`[${data.agent.name}] ${data.agent.currentTask} (${data.agent.progress}%)`);
        term.write('$ '); // Restore prompt
      }
    };
    if (socketHandlersRef.current.aiTeamProgress) {
      socket.off('ai-team:progress', socketHandlersRef.current.aiTeamProgress);
    }
    socketHandlersRef.current.aiTeamProgress = aiTeamProgressHandler;
    socket.on('ai-team:progress', aiTeamProgressHandler);

    // Handle AI Team completion
    // ⚡ PERFORMANCE FIX (Feb 2, 2025): Convert to named handler with socketHandlersRef storage
    const aiTeamCompleteHandler = (data: any) => {
      if (term) {
        term.writeln(`\r\n✅ AI Team completed! Generated ${data.filesCount || 0} files`);
        term.write('$ ');
      }
    };
    if (socketHandlersRef.current.aiTeamComplete) {
      socket.off('ai-team:complete', socketHandlersRef.current.aiTeamComplete);
    }
    socketHandlersRef.current.aiTeamComplete = aiTeamCompleteHandler;
    socket.on('ai-team:complete', aiTeamCompleteHandler);

    // Handle team:summary event - display formatted summary in main terminal
    const teamSummaryHandler = (data: any) => {
      if (term && data) {
        const { teamId, agents, totalDurationSec, totalTokensFormatted, totalFiles, workTreeRoot } = data;
        
        term.writeln('');
        term.writeln('\x1b[36m╔═══════════════════════════════════════════════════════════════╗\x1b[0m');
        term.writeln('\x1b[36m║\x1b[0m  \x1b[32m🎉 AI TEAM COMPLETED\x1b[0m                                        \x1b[36m║\x1b[0m');
        term.writeln('\x1b[36m╠═══════════════════════════════════════════════════════════════╣\x1b[0m');
        
        // Display each agent's summary
        for (const agent of agents || []) {
          const statusIcon = agent.isError ? '❌' : '📦';
          term.writeln('\x1b[36m║\x1b[0m                                                               \x1b[36m║\x1b[0m');
          term.writeln(`\x1b[36m║\x1b[0m  ${statusIcon} \x1b[33m${agent.name}\x1b[0m (${agent.durationSec}s, ${agent.tokensFormatted} tokens)`.padEnd(66) + '\x1b[36m║\x1b[0m');
          
          // Display bullet points
          for (const bullet of agent.bullets || []) {
            term.writeln(`\x1b[36m║\x1b[0m     ✓ ${bullet.substring(0, 55)}`.padEnd(66) + '\x1b[36m║\x1b[0m');
          }
          
          // Display file tree
          if (agent.files && agent.files.length > 0) {
            const firstFile = agent.files[0];
            const projectDir = firstFile.split('/')[0] || 'project';
            term.writeln(`\x1b[36m║\x1b[0m     \x1b[90m${projectDir}/\x1b[0m`.padEnd(66) + '\x1b[36m║\x1b[0m');
            for (const file of agent.files.slice(0, 5)) {
              term.writeln(`\x1b[36m║\x1b[0m     \x1b[90m├── ${file.substring(0, 50)}\x1b[0m`.padEnd(66) + '\x1b[36m║\x1b[0m');
            }
            if (agent.moreFiles > 0) {
              term.writeln(`\x1b[36m║\x1b[0m     \x1b[90m└── ...and ${agent.moreFiles} more files\x1b[0m`.padEnd(66) + '\x1b[36m║\x1b[0m');
            }
          }
        }
        
        term.writeln('\x1b[36m║\x1b[0m                                                               \x1b[36m║\x1b[0m');
        term.writeln('\x1b[36m╠═══════════════════════════════════════════════════════════════╣\x1b[0m');
        term.writeln(`\x1b[36m║\x1b[0m  ⏱️  Total: ${totalDurationSec}s | 🔤 ${totalTokensFormatted} tokens | 📁 ${totalFiles} files`.padEnd(66) + '\x1b[36m║\x1b[0m');
        term.writeln('\x1b[36m║\x1b[0m                                                               \x1b[36m║\x1b[0m');
        term.writeln(`\x1b[36m║\x1b[0m  📁 Files at: \x1b[33m.claude-parallel-dev/${teamId?.split('-').slice(0,2).join('-')}-.../\x1b[0m`.padEnd(75) + '\x1b[36m║\x1b[0m');
        term.writeln('\x1b[36m║\x1b[0m                                                               \x1b[36m║\x1b[0m');
        term.writeln('\x1b[36m╠═══════════════════════════════════════════════════════════════╣\x1b[0m');
        term.writeln('\x1b[36m║\x1b[0m  \x1b[32m👀 NEXT STEPS:\x1b[0m                                               \x1b[36m║\x1b[0m');
        term.writeln('\x1b[36m║\x1b[0m                                                               \x1b[36m║\x1b[0m');
        term.writeln('\x1b[36m║\x1b[0m     1. Click \x1b[36m👁️  Preview\x1b[0m in StatusBar to review code        \x1b[36m║\x1b[0m');
        term.writeln('\x1b[36m║\x1b[0m     2. Click \x1b[32m⬇  Download\x1b[0m to export project (ZIP/JSON)   \x1b[36m║\x1b[0m');
        term.writeln('\x1b[36m║\x1b[0m     3. Review changes before merging to main                \x1b[36m║\x1b[0m');
        term.writeln('\x1b[36m║\x1b[0m                                                               \x1b[36m║\x1b[0m');
        term.writeln('\x1b[36m╚═══════════════════════════════════════════════════════════════╝\x1b[0m');
        term.writeln('');
        term.write('$ ');
      }
    };
    if ((socketHandlersRef.current as any).teamSummary) {
      socket.off('team:summary', (socketHandlersRef.current as any).teamSummary);
    }
    (socketHandlersRef.current as any).teamSummary = teamSummaryHandler;
    socket.on('team:summary', teamSummaryHandler);

    // Handle agent:spawn event from WebSocket (real-time team spawning)
    const agentSpawnHandler = async (data: any) => {
      
      if (term) {
        term.writeln(`\r\n✅ AI Team spawned with ${data.agents?.length || 0} agents`);
        term.writeln(`📊 Team ID: ${data.teamId}`);
      }
      
      // Create agent terminal tabs if agents are provided
      if (data.agents && data.agents.length > 0) {
        if (term) {
          term.writeln(`📋 Creating ${data.agents.length} agent terminal tabs...`);
        }
        
        // Get socket for agent terminal communication
        const socket = await getSocket();
        
        data.agents.forEach((agent: any, index: number) => {
          // Add delay to ensure events are processed in order
          setTimeout(() => {
            const agentSessionData = {
              id: agent.id || `agent_${data.teamId}_${index}_${Date.now()}`,
              name: agent.name || `${agent.role} Agent`,
              role: agent.role?.toLowerCase() || 'fullstack',
              teamId: data.teamId,
              workTreePath: agent.workTreePath,
              terminalHistory: `Agent initialized: ${agent.name}\nRole: ${agent.role}\nTeam: ${data.teamId}\n`,
              status: agent.status || 'initializing',
              progress: 0,
              currentTask: agent.currentTask || 'Setting up workspace...',
              processId: agent.processId
            };
            
            
            // Dispatch event to create agent tab
            window.dispatchEvent(new CustomEvent('terminal:createAgentSession', {
              detail: agentSessionData
            }));
            
            // Create agent terminal session via WebSocket
            if (socket?.connected) {
              socket.emit('agent:terminal:create', {
                agentId: agentSessionData.id,
                teamId: agentSessionData.teamId,
                role: agentSessionData.role
              });
            } else {
              console.warn(`⚠️ [WEBSOCKET] Socket not connected, cannot create terminal session`);
            }
          }, 0); // 🔧 FIX #2 (Nov 19, 2025): Removed staggered delays - spawn all agents simultaneously
        });
        
        if (term) {
          term.writeln(`✅ Created ${data.agents.length} agent terminal tabs`);
          term.write('$ ');
        }
      }
    };
    if (socketHandlersRef.current.agentSpawn) {
      socket.off('agent:spawn', socketHandlersRef.current.agentSpawn);
    }
    socketHandlersRef.current.agentSpawn = agentSpawnHandler;
    socket.on('agent:spawn', agentSpawnHandler);

    // Listen for agent terminal creation confirmation and connect socket
    const agentTerminalCreatedHandler = ({ agentId, teamId, role }: { agentId: string; teamId: string; role: string }) => {
      socket.emit('agent:terminal:connect', { agentId });
    };
    if (socketHandlersRef.current.agentTerminalCreated) {
      socket.off('agent:terminal:created', socketHandlersRef.current.agentTerminalCreated);
    }
    socketHandlersRef.current.agentTerminalCreated = agentTerminalCreatedHandler;
    socket.on('agent:terminal:created', agentTerminalCreatedHandler);

    // 🔧 FIX #1 (Nov 19, 2025): REMOVED DUPLICATE LISTENER
    // This was creating MaxListenersExceededWarning and causing socket churn
    // The agent:terminal:data listener is properly handled in the useEffect hook
    // at lines 2145-2191, which is the correct place for agent terminal data listeners
    // Removing this duplicate fixes the re-render cascade that was disconnecting sockets

    // Set up terminal input handling - send to backend
    // Skip in sandbox mode - it's read-only (but allow agent terminals)
    if (sandboxMode && !agentMode) {
      return;
    }
    
    // Agent terminals can accept input for interactive commands
    if (agentMode) {
    }
    
    // Clean up any existing handler first
    if (onDataDisposableRef.current) {
      onDataDisposableRef.current.dispose();
      onDataDisposableRef.current = null;
    }
    
    // Create new handler and store the disposable
    onDataDisposableRef.current = term.onData((data) => {
      // Only log important events, not every character
      
      // Use the ref for most current session ID
      const currentSessionId = sessionIdForVoiceRef.current || sessionId;
      
      // Check session validity first
      if (!currentSessionId) {
        term.writeln('\r\n⚠️ Terminal session not initialized. Please refresh the page.');
        return;
      }
      
      // Validate session before processing input (updated to use current session)
      if (!isValidSession(currentSessionId)) {
        term.writeln('\r\n⚠️ Terminal session is invalid. Please refresh the page.');
        return;
      }
      
      if (!socket.connected) {
        // Buffer input when disconnected
        inputBufferRef.current.push(data);
        // Show local echo for better UX
        term.write(data);
        
        // Show reconnection message once
        if (!term.buffer.active.getLine(term.buffer.active.cursorY)?.translateToString().includes('Reconnecting')) {
          term.writeln('\r\n⚠️ Connection lost. Reconnecting... (your input is buffered)');
        }
        return;
      }
      
      // Send input to backend via Socket.IO with current session ID
      // ⚡ PERFORMANCE FIX (Feb 2, 2025): Removed console.log from keystroke path (accumulates console memory)
      
      // Route through mode manager for Gemini/GLM, direct socket for Claude
      const modeManager = modeManagerRef.current;
      const currentMode = modeManager?.getCurrentMode();
      
      if (currentMode === 'GEMINI_API') {
        // GEMINI_API mode: chat-style interaction (no PTY)
        // Note: GLM now uses CLAUDE_CLI mode with Z.AI backend
        
        // Handle Enter key - send message to API
        if (data === '\r') {
          const bufferValue = lineBufferRef.current; // Use ref for immediate value
          if (bufferValue.trim()) {
            const message = bufferValue.trim();
            
            // Intercept 'claude' command in API mode
            if (message.startsWith('claude')) {
              const modelName = useModelStore.getState().getModelDisplayName();
              term.writeln(`\r\n\x1b[38;5;214m⚠️  You're currently in ${modelName} mode.\x1b[0m`);
              term.writeln('\x1b[38;5;245mTo use Claude Code CLI, switch to a Claude model from the dropdown.\x1b[0m');
              term.writeln(`\x1b[38;5;245mOr type your message to continue chatting with ${modelName}.\x1b[0m`);
              term.write('\r\n$ ');
              // Don't send this to API or bash
              // Let Enter key fall through to clear buffer
            } else {
              // Normal API message handling
              modeManager?.sendMessage(message, (event: string, data: any) => socket.emit(event, data))
                .then(response => {
                  if (response) {
                    // Format response for terminal display
                    const formattedResponse = response
                      .split('\n')
                      .map((line: string) => line.trimEnd()) // Remove trailing whitespace
                      .join('\r\n'); // Use proper line endings for terminal
                    
                    term.writeln('\r\n' + formattedResponse);
                    term.write('\r\n$ '); // Show prompt after response
                  }
                })
                .catch(err => {
                  console.error('❌ Mode manager error:', err);
                  term.writeln('\r\n❌ Error: ' + err.message);
                  term.write('\r\n$ ');
                });
            }
          }
          // Let Enter key fall through to normal buffer clearing below
        } else if (data === '\x7F') {
          // Backspace - need to handle visually for API mode
          if (lineBufferRef.current.length > 0) {
            // Move cursor back, write space, move cursor back again (erase character)
            term.write('\b \b');
          }
          // Let backspace fall through to update buffer state below
        } else {
          // API modes need local echo for regular characters (no PTY to echo back)
          term.write(data);
        }
        // For all keys (including Enter), continue to update buffer state below
        // Don't send to PTY socket for API modes
      } else {
        // Use direct socket for Claude CLI mode (PTY)
        socket.emit('terminal:input', {
          id: currentSessionId,
          data,
          selectedClaudeModel: useModelStore.getState().selectedModel,
          skipPermissions: terminalSettings.skipPermissions
        });
      }
      
      // Process any buffered input
      processInputBuffer();
      
      // Track current line buffer for command history
      if (data === '\r') {
        // 🔧 FIX (Feb 1, 2025): Set claudeActive TRUE when Enter is pressed
        // This allows contextual memory to skip regex processing BEFORE Claude responds
        setClaudeActive(true);
        
        // 🔧 FIX (Feb 1, 2025): Auto-reset claudeActive after 5 seconds if no response
        // This prevents claudeActive from staying stuck at true
        if (claudeActivityTimeoutRef.current) {
          clearTimeout(claudeActivityTimeoutRef.current);
        }
        claudeActivityTimeoutRef.current = setTimeout(() => {
          setClaudeActive(false);
        }, 5000); // Reset after 5 seconds if no Claude output detected
        
        // Enter pressed - command was sent
        // ⚡ PERFORMANCE FIX (Feb 2, 2025): Read from ref instead of state (no setState on keystrokes)
        if (lineBufferRef.current.trim()) {
          const command = lineBufferRef.current.trim();
          setCommandHistory(prev => [...prev, command]);
          
          // Check for copy-files command first
          if (command === 'copy-files' || command === 'copy-for-claude') {
            // Try to copy the uploaded files to clipboard
            const copyFunction = (window as any).copyFilesForClaude;
            if (copyFunction && typeof copyFunction === 'function') {
              copyFunction().then((success: boolean) => {
                if (success) {
                } else {
                }
              });
            } else {
              term.write('\r\n⚠️ No files have been uploaded yet.\r\n');
              term.write('Drag and drop files into the terminal first.\r\n\r\n');
            }
            return; // Don't process this command further
          }
          
          // Track input tokens for AI commands
          if (command.toLowerCase().includes('claude') || 
              command.toLowerCase().includes('ai') || 
              command.startsWith('/') ||
              claudeActive) {
            // Estimate input tokens (~1 token per 4 characters)
            const estimatedTokens = Math.ceil(command.length / 4);
            
            // Update token usage in the IDE store
            const store = useIDEStore.getState();
            const currentUsage = store.aiState?.tokenUsage || { input: 0, output: 0, total: 0 };
            
            // Input tokens from user commands
            store.updateTokenUsage({
              input: currentUsage.input + estimatedTokens,
              output: currentUsage.output,
              total: currentUsage.total + estimatedTokens
            });
          }
          
          // Check if this is an AI command that should be handled locally
          terminalCommandHandler.processCommand(command).then(result => {
            if (result.handled) {
              // Command was handled by the AI system
              if (result.output) {
                term.write(result.output);
              }
              if (result.error) {
                term.write(result.error);
              }
              // Don't send to backend - it was handled locally
              return;
            }
            
            // Not an AI command - continue with normal processing
          });
            
          // Notify parent component about the command
          if (onTerminalCommand) {
            onTerminalCommand(command);
          } else {
            console.warn('⚠️ [CALLBACK] onTerminalCommand callback missing');
          }
        }
        setCurrentLineBuffer('');
        lineBufferRef.current = ''; // Sync ref clear
      } else if (data === '\x7F') {
        // Backspace
        // ⚡ PERFORMANCE FIX (Feb 2, 2025): Removed setCurrentLineBuffer() to prevent re-render on every keystroke
        // Only update ref - no React state update needed until Enter is pressed
        lineBufferRef.current = lineBufferRef.current.slice(0, -1);
      } else if (data >= ' ' || data === '\t') {
        // Regular character
        // ⚡ PERFORMANCE FIX (Feb 2, 2025): Removed setCurrentLineBuffer() to prevent re-render on every keystroke
        // Only update ref - no React state update needed until Enter is pressed
        lineBufferRef.current = lineBufferRef.current + data;
        
        // Check if "claude" has been typed (use ref instead of state)
        if (lineBufferRef.current.toLowerCase().includes('claude')) {
          // Activate supervision when claude is typed
          if (!isSupervisionActive) {
            enableSupervision();
            // REMOVED: // REMOVED: console.log('👁️ Supervision auto-activated: claude detected');
          }
          if (onClaudeTyped) {
            onClaudeTyped();
          }
        }
      }
    });

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current && socket.connected) {
        // Safety check: Ensure terminal container has valid dimensions
        if (terminalRef.current && terminalRef.current.offsetWidth > 0 && terminalRef.current.offsetHeight > 0) {
          try {
            fitAddonRef.current.fit();
            const { cols, rows } = xtermRef.current;
            socket.emit('terminal:resize', { id: sessionId, cols, rows });
            
            // Button positioning is handled by CSS - no recalculation needed
          } catch (error) {
            // Silently handle dimension errors during resize
            console.warn('Terminal resize skipped - dimensions not ready');
          }
        }
      }
    };

    // Duplicate resize observer removed - already handled in createTerminal
  };

  // Removed duplicate useEffect - connection is already handled above

  // Handle AI Team spawn
  const handleSpawnAgents = async () => {
    if (!xtermRef.current) return;
    
    // Validate session ID exists
    if (!sessionId) {
      xtermRef.current.writeln('\r\n❌ Error: No active terminal session. Please create a terminal session first.');
      return;
    }
    
    // DON'T show "Spawning" message yet - quality gate needs to check first
    xtermRef.current.writeln('\r\n🔍 Analyzing conversation history...');
    
    try {
      // Step 1: Extract requirement from terminal conversation history
      const unifiedServerUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : (process.env.NEXT_PUBLIC_UNIFIED_SERVER_URL || 'http://localhost:3001');
      
      const extractionResponse = await fetch(`${unifiedServerUrl}/api/terminal/extract-requirement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      
      const extractionData = await extractionResponse.json();
      
      // DEBUG: Log extraction response
      console.log('[AI Team] Extraction response:', {
        success: extractionData.success,
        hasRequirement: !!extractionData.requirement,
        fallbackNeeded: extractionData.fallbackNeeded,
        hasQuality: !!extractionData.quality,
        qualityScore: extractionData.quality?.score,
        qualityPassed: extractionData.quality?.passed
      });
      
      let requirement: string;
      
      if (extractionData.success && extractionData.requirement && !extractionData.fallbackNeeded) {
        // Successfully extracted requirement from conversation history
        requirement = extractionData.requirement;
        const confidenceEmoji = extractionData.confidence === 'high' ? '✅' : '⚠️';
        xtermRef.current.writeln(`${confidenceEmoji} Extracted requirement (${extractionData.confidence} confidence):`);
        xtermRef.current.writeln(`   "${requirement.substring(0, 100)}${requirement.length > 100 ? '...' : ''}"`);
        
        // MANDATORY quality check - no quality data = automatic block
        if (!extractionData.quality) {
          console.log('[AI Team] BLOCKING: No quality data present');
          xtermRef.current.writeln('\r\n⚠️ Unable to assess context quality.');
          xtermRef.current.writeln('💡 This is unusual - quality assessment should always be present.');
          xtermRef.current.writeln('💡 Please have a conversation with Claude about your project first,');
          xtermRef.current.writeln('   then try the AI Team button again.');
          xtermRef.current.write('\r\n$ ');
          return;
        }
        
        console.log('[AI Team] Quality data exists, checking threshold...');
        
        // Quality data exists - check if it passes threshold
        const quality = extractionData.quality;
        xtermRef.current.writeln(`\r\n📊 Context Quality: ${quality.score}% (${quality.aspectsDetected}/${quality.totalAspects} aspects detected)`);
        
        if (!quality.passed) {
          // Quality gate blocks spawning
          console.log('[AI Team] BLOCKING: Quality score too low', {
            score: quality.score,
            threshold: quality.threshold,
            suggestions: quality.suggestions,
            hasXtermRef: !!xtermRef.current
          });
          
          // Check if xterm is available
          if (!xtermRef.current) {
            console.error('[AI Team] ERROR: xtermRef.current is null - cannot write to terminal!');
            return;
          }
          
          try {
            xtermRef.current.writeln('\r\n⚠️ Not enough context for quality AI Team work.');
            xtermRef.current.writeln(`💡 Need ${quality.threshold}% minimum (currently ${quality.score}%)`);
            xtermRef.current.writeln('\r\n💡 Please discuss these details with Claude first:');
            
            quality.suggestions.forEach((suggestion: string, i: number) => {
              xtermRef.current?.writeln(`   ${i + 1}. ${suggestion}`);
            });
            
            xtermRef.current.writeln('\r\n💬 Example: Type "claude" then have a conversation about your project');
            xtermRef.current.writeln('   Then click AI Team when you have more details.');
            xtermRef.current.write('\r\n$ ');
            
            console.log('[AI Team] Successfully wrote blocking message to terminal');
          } catch (err) {
            console.error('[AI Team] ERROR writing to terminal:', err);
          }
          return;
        }
        
        // Quality passed - show green light and NOW show spawning message
        console.log('[AI Team] Quality check PASSED - proceeding to spawn');
        xtermRef.current.writeln('✅ Context quality is sufficient for AI Team spawning.');
        xtermRef.current.writeln('\r\n⚡ Spawning AI Team...');
      } else {
        // 🔧 FIX: No conversation history - use default requirement instead of blocking
        console.log('[AI Team] No conversation history - using default requirement');
        requirement = 'Build a web application with modern best practices';
        xtermRef.current.writeln('📝 No prior conversation detected - using default requirement:');
        xtermRef.current.writeln(`   "${requirement}"`);
        xtermRef.current.writeln('\r\n💡 TIP: For better results, describe your project in the terminal first');
        xtermRef.current.writeln('   Example: Type "claude I want to build a fitness app landing page"');
        xtermRef.current.writeln('\r\n⚡ Spawning AI Team with default requirement...');
      }
      
      // Step 2: Spawn agents with extracted requirement
      console.log('[AI Team] Quality gate passed - starting agent spawn');
      xtermRef.current.writeln('🤖 Connecting to AI Team Management System...');
      
      const response = await fetch(`${unifiedServerUrl}/api/claude-bridge/spawn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement,
          sessionId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAgentsRunning(true);
        
        xtermRef.current.writeln(`✅ AI Team spawned with ${data.agents?.length || 0} automated agents`);
        xtermRef.current.writeln(`📊 Team ID: ${data.teamId}`);
        xtermRef.current.writeln(`👥 ${data.agents?.length || 0} agents deployed`);
        
        // Display agent details
        if (data.agents && data.agents.length > 0) {
          xtermRef.current.writeln('\r\n🤖 Agent Roster:');
          data.agents.forEach((agent: any) => {
            xtermRef.current?.writeln(`  • ${agent.name} - ${agent.role}`);
          });
        }
        
        xtermRef.current.writeln('\r\nAgents are now working in parallel. Updates will appear here.');
        xtermRef.current.write('\r\n$ ');
        
        // Create agent terminal tabs (Phase 1) - Always enabled now
        // FIX: Removed env var check to avoid race condition
        
        if (data.agents && data.agents.length > 0) {
          xtermRef.current.writeln('\r\n📋 Creating agent terminal tabs...');
          
          // Get socket for WebSocket communication
          const socket = await getSocket();
          
          data.agents.forEach((agent: any, index: number) => {
            // Add a small delay for each agent to ensure events are processed
            setTimeout(() => {
              // Create agent session data with unique ID
              const agentSessionData = {
                id: agent.id || `agent_${data.teamId}_${index}_${Date.now()}`,
                name: agent.name || `${agent.role} Agent`,
                role: agent.role?.toLowerCase() || 'fullstack',
                teamId: data.teamId,
                workTreePath: agent.workTreePath,
                terminalHistory: `Agent initialized: ${agent.name}\nRole: ${agent.role}\nTeam: ${data.teamId}\n`,
                status: agent.status || 'initializing',
                progress: 0,
                currentTask: agent.currentTask || 'Setting up workspace...',
                processId: agent.processId
              };
              
              
              // Dispatch event to create agent tab
              window.dispatchEvent(new CustomEvent('terminal:createAgentSession', {
                detail: agentSessionData
              }));
              
              // Phase 2: Also create agent terminal session via WebSocket
              if (socket?.connected) {
                socket.emit('agent:terminal:create', {
                  agentId: agentSessionData.id,
                  teamId: agentSessionData.teamId,
                  role: agentSessionData.role
                });
              } else {
                console.warn(`⚠️ Socket not connected, cannot create terminal session for ${agentSessionData.name}`);
              }
            }, index * 100); // 100ms delay between each agent
          });
          
          xtermRef.current.writeln(`✅ Created ${data.agents.length} agent terminal tabs`);
        }
        
        // Notify parent component
        if (onAgentsSpawn) {
          onAgentsSpawn();
        }
        
        // Update the AITeamDashboard in PreviewPanel
        if (typeof window !== 'undefined' && (window as any).updateAITeamDashboard) {
          (window as any).updateAITeamDashboard({
            teamId: data.teamId,
            status: data.status || 'active',
            agents: data.agents || [],
            progress: { overall: 0 },
            generatedFiles: 0,
            requirement: 'Build a complete project based on user requirements',
            workflow: data.workflow,
            executionType: data.executionType
          });
        }
      } else {
        throw new Error(data.error || 'Failed to spawn AI team');
      }
    } catch (error) {
      // logger?.error('AI Team spawn failed:', error);
      xtermRef.current.writeln(`❌ Failed to spawn AI team: ${error}`);
      xtermRef.current.writeln('🔧 Check that the server is running and try again');
      xtermRef.current.write('\r\n$ ');
      
      setAgentsRunning(false);
    }
  };

  // Staged Composer handlers
  const handleSendStagedCommand = useCallback(async (command: string, images?: Array<{ base64: string; mimeType: string; mode?: 'ocr' | 'vision'; extractedText?: string }>) => {
    if (!socketRef.current?.connected || !sessionId) {
      console.error('Cannot send command: no socket connection or session');
      return;
    }

    // Handle images with dual-mode processing (OCR + Vision API)
    if (images && images.length > 0) {

      // Separate images by processing mode
      const ocrImages = images.filter(i => i.mode === 'ocr' || !i.mode); // Default to OCR
      const visionImages = images.filter(i => i.mode === 'vision');

      let enrichedCommand = command;

      // Process OCR images - extract text and append to command
      if (ocrImages.length > 0) {
        xtermRef.current?.writeln('\r\n\x1b[36m🔤 Extracting text from ' + ocrImages.length + ' image(s)...\x1b[0m');

        for (let i = 0; i < ocrImages.length; i++) {
          const img = ocrImages[i];
          try {
            if (img.extractedText) {
              // Use cached OCR result
              enrichedCommand += `\n\n[Text extracted from image ${i + 1}]:\n${img.extractedText}`;
            } else {
              // Perform OCR via API
              xtermRef.current?.writeln(`  📄 Processing image ${i + 1}/${ocrImages.length}...`);
              const res = await fetch('/api/ocr/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64: img.base64, mimeType: img.mimeType })
              });
              const result = await res.json();
              if (result.success && result.text) {
                enrichedCommand += `\n\n[Text extracted from image ${i + 1} (${Math.round(result.confidence)}% confidence)]:\n${result.text}`;
                xtermRef.current?.writeln(`  ✅ Extracted ${result.text.length} characters`);
              } else {
                xtermRef.current?.writeln(`  ⚠️ Could not extract text from image ${i + 1}`);
              }
            }
          } catch (err) {
            console.error('OCR extraction failed:', err);
            xtermRef.current?.writeln(`  ❌ OCR failed for image ${i + 1}`);
          }
        }
      }

      // Process Vision images - send to Anthropic API
      if (visionImages.length > 0) {
        xtermRef.current?.writeln('\r\n\x1b[35m👁️ Analyzing ' + visionImages.length + ' image(s) with Claude Vision API...\x1b[0m');

        try {
          const response = await fetch('/api/claude/chat-with-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: enrichedCommand,
              images: visionImages.map(i => ({ base64: i.base64, mimeType: i.mimeType }))
            })
          });

          const result = await response.json();

          if (result.content || result.response) {
            const visionResponse = result.content || result.response;
            xtermRef.current?.writeln('\r\n\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
            xtermRef.current?.writeln('\x1b[35m👁️ Claude Vision Analysis\x1b[0m');
            xtermRef.current?.writeln('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\r\n');
            // Write response line by line
            visionResponse.split('\n').forEach((line: string) => {
              xtermRef.current?.writeln(line);
            });
            xtermRef.current?.writeln('\r\n\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\r\n');
          } else if (result.error) {
            xtermRef.current?.writeln(`\r\n\x1b[31m❌ Vision API Error: ${result.error}\x1b[0m\r\n`);
          }

          // Close composer and reset state after vision processing
          setIsProcessingCommand(false);
          setComposerVisible(false);
          setStagedCommand('');
          if (xtermRef.current) xtermRef.current.focus();
          return;

        } catch (err) {
          console.error('Vision API failed:', err);
          xtermRef.current?.writeln(`\r\n\x1b[31m❌ Vision API failed: ${err instanceof Error ? err.message : 'Unknown error'}\x1b[0m\r\n`);
        }
      }

      // If only OCR (no vision), continue with enriched command to CLI
      if (visionImages.length === 0 && ocrImages.length > 0) {
        command = enrichedCommand;
        xtermRef.current?.writeln('\r\n\x1b[32m✅ Text extracted, sending to Claude...\x1b[0m\r\n');
      }
    }

    // If in planning mode, add to planned commands instead of executing
    if (planningMode) {
      setPlannedCommands(prev => [...prev, command]);
      xtermRef.current?.writeln(`\x1b[33m[PLANNED ${plannedCommands.length + 1}]\x1b[0m ${command.substring(0, 80)}${command.length > 80 ? '...' : ''}`);
      setComposerVisible(false);
      setStagedCommand('');
      
      // Focus terminal after adding to plan
      if (xtermRef.current) {
        xtermRef.current.focus();
      }
      return;
    }

    // Safety check: Prevent processing of extremely large texts that could cause token explosions
    const MAX_COMMAND_LENGTH = 50000; // ~12.5K tokens at 4 chars/token
    if (command.length > MAX_COMMAND_LENGTH) {
      console.warn(`🚨 Command too large: ${command.length} chars (max ${MAX_COMMAND_LENGTH})`);
      xtermRef.current?.writeln(`\r\n⚠️ Command too large (${Math.round(command.length/1000)}K chars). Max allowed: ${Math.round(MAX_COMMAND_LENGTH/1000)}K chars.`);
      xtermRef.current?.writeln('Please reduce the text size or split into smaller commands.\r\n');
      setIsProcessingCommand(false);
      setComposerVisible(false);
      setStagedCommand('');
      return;
    }

    setIsProcessingCommand(true);

    // Send command as single input to prevent character-by-character processing
    // This fixes the infinite loop issue with large PDF text (was causing 1.7M token usage)
    socketRef.current.emit('terminal:input', {
      id: sessionId,
      data: command + '\r', // Include Enter key to execute command
      selectedClaudeModel,
      skipPermissions: terminalSettings.skipPermissions,
      // Include image metadata if present
      ...(images && images.length > 0 ? { 
        attachedImages: images 
      } : {})
    });
    
    // Increment command counter for metrics
    try {
      await fetch('/api/claude/usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'increment',
          sessionId,
          tokens: {
            input: Math.ceil(command.length / 4), // Rough estimate: 4 chars per token
            output: 0 // Will be updated when response comes
          }
        })
      });
    } catch (error) {
      console.error('Failed to update usage metrics:', error);
    }
    
    setIsProcessingCommand(false);
    setComposerVisible(false);
    setStagedCommand('');
    
    // Focus terminal after sending
    if (xtermRef.current) {
      xtermRef.current.focus();
    }
  }, [sessionId, selectedClaudeModel, planningMode, plannedCommands.length]);

  // Handle context menu for save as markdown
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuVisible(true);
  }, []);

  const handleSaveAsMarkdown = useCallback(() => {
    if (!xtermRef.current) return;
    
    // Get terminal buffer content
    const terminal = xtermRef.current;
    const buffer = terminal.buffer.active;
    const lines: string[] = [];
    
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (line) {
        lines.push(line.translateToString(true));
      }
    }
    
    // Format as markdown
    const markdown = `# Terminal Session - ${new Date().toISOString()}\n\n\`\`\`bash\n${lines.join('\n')}\n\`\`\`\n`;
    
    // Create download
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal-session-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setContextMenuVisible(false);
  }, []);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenuVisible(false);
    };
    
    if (contextMenuVisible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenuVisible]);

  const getCurrentLineFromTerminal = useCallback(() => {
    if (!xtermRef.current) return '';
    
    try {
      const buffer = xtermRef.current.buffer.active;
      const cursorY = buffer.cursorY + buffer.viewportY;
      const line = buffer.getLine(cursorY);
      if (line) {
        return line.translateToString(true).trim();
      }
    } catch (error) {
      console.error('Error getting current line:', error);
    }
    return '';
  }, []);

  // Claude Code Session Token Monitoring (Nov 24, 2025)
  // Poll for token usage updates from Claude Code session files
  useEffect(() => {
    // Only monitor if we have a session ID and not in sandbox mode
    if (!sessionId || sandboxMode) return;

    // ALPHA FIX (Dec 3, 2025): Disable session-usage polling in production
    // This feature reads local Claude Code session files which only exist on the local machine
    // Production users would get 404 errors because the hardcoded path doesn't exist on the server
    // TODO: Re-enable when bridge can report session data from the user's local machine
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return;
    }


    // Poll every 5 seconds for token usage updates
    const pollSessionUsage = async () => {
      try {
        // Use correct directory path (with dashes, not underscores)
        const cwd = '/Users/michaelkraft/autonomous-vibe-interface';
        
        const response = await fetch(`/api/claude/session-usage?cwd=${encodeURIComponent(cwd)}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.usage) {
            // Update token counter with real Claude Code session data
            const store = useIDEStore.getState();
            store.updateTokenUsage({
              input: data.usage.input,
              output: data.usage.output,
              total: data.usage.total
            });
          }
        }
      } catch (error) {
        // Silent fail - session file might not exist yet
      }
    };

    // Initial poll
    pollSessionUsage();

    // Set up polling interval
    sessionUsagePollerRef.current = setInterval(pollSessionUsage, 5000);

    return () => {
      if (sessionUsagePollerRef.current) {
        clearInterval(sessionUsagePollerRef.current);
        sessionUsagePollerRef.current = null;
      }
    };
  }, [sessionId, sandboxMode]);

  // Keyboard shortcuts for staged composer
  useEffect(() => {
    // Only enable keyboard shortcuts if feature is enabled
    if (!ENABLE_STAGED_COMPOSER) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when terminal is focused and not in sandbox mode
      if (!xtermRef.current || sandboxMode) return;
      
      // Ctrl+Space to open composer
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        setComposerVisible(true);
        return;
      }
      
      // Ctrl+E to edit current line
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        const currentLine = getCurrentLineFromTerminal();
        setStagedCommand(currentLine);
        setComposerVisible(true);
        return;
      }
    };

    // Add listener at document level with capture to intercept before terminal
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [sandboxMode, getCurrentLineFromTerminal]);

  // Handle sandbox panel modal
  const handleSandboxAction = () => {
    
    try {
      setShowSandboxPanel(true);
      
      // Verify state was set
      setTimeout(() => {
      }, 100);
    } catch (error) {
      console.error('❌ [SANDBOX] Error opening sandbox panel:', error);
    }
  };

  // Legacy sandbox creation function (kept for reference)
  const createSandboxDirect = async () => {
    
    // Reset previous status
    setSandboxCreationStatus('creating');
    setSandboxCreationMessage('');
    setCreatedSandboxId('');
    
    // Add console logging for debugging
    
    const projectName = `sandbox-${Date.now().toString(36).slice(-6)}`;
    
    try {
      const response = await fetch('/api/sandbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'default-user'
        },
        body: JSON.stringify({
          projectId: projectName
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSandboxCreationStatus('success');
        setSandboxCreationMessage(`✅ Sandbox "${projectName}" created successfully!`);
        setCreatedSandboxId(data.sandbox.id);
        
        // Log success
        
        // Show alert for immediate feedback
        alert(`✅ Sandbox created successfully!\n\nID: ${data.sandbox.id}\nProject: ${data.sandbox.projectId}\nPath: ${data.sandbox.path}\n\nA new tab will open with your sandbox workspace.`);
        
        // Try to show toast (may fail with CSS issues)
        try {
          addToast({
            message: `✅ Sandbox "${projectName}" created!`,
            type: 'success'
          });
        } catch (e) {
          console.warn('Toast notification failed:', e);
        }
        
        // Emit event for other components
        window.dispatchEvent(new CustomEvent('sandbox:created', {
          detail: { sandboxId: data.sandbox.id }
        }));
        
        // Navigate to consultation workspace after short delay
        setTimeout(() => {
          // Open consultation page with sandbox ID as parameter
          const workspaceUrl = `/consultation?sandbox=${data.sandbox.id}`;
          window.open(workspaceUrl, '_blank');
          
          // Reset status after navigation
          setSandboxCreationStatus('idle');
          setSandboxCreationMessage('');
        }, 2000); // Shorter delay before opening
        
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setSandboxCreationStatus('error');
      setSandboxCreationMessage(`❌ Failed: ${errorMessage}`);
      
      // Console error for debugging
      console.error('❌ Sandbox creation failed:', error);
      
      // Try toast (may fail)
      try {
        addToast({
          message: `❌ Failed to create sandbox: ${errorMessage}`,
          type: 'error'
        });
      } catch (e) {
        console.warn('Toast notification failed:', e);
      }
      
      // For critical errors, use browser alert as fallback
      if (errorMessage.includes('Maximum sandbox limit')) {
        alert(`Cannot create sandbox: ${errorMessage}`);
      }
      
      // Keep error visible for 5 seconds
      setTimeout(() => {
        setSandboxCreationStatus('idle');
        setSandboxCreationMessage('');
      }, 5000);
    }
  };

  // Get current context for Claude
  const getCurrentContext = () => {
    const context = {
      project: 'Next.js 14 + TypeScript + Tailwind IDE',
      directory: 'coder1-ide-next',
      agents_active: agentsRunning,
      supervision_active: isSupervisionActive,
      terminal_mode: terminalMode,
      voice_input: voiceListening
    };
    return JSON.stringify(context, null, 2);
  };

  return (
    <div className="h-full flex flex-col bg-bg-primary relative">
      {/* Terminal Header - Exact 40px height */}
      <div 
        className={`flex items-center justify-between border-b border-border-default px-3 bg-bg-secondary ${
          planningMode
            ? 'border-t border-t-yellow-500/50 shadow-glow-yellow'
            : sandboxMode 
            ? 'border-t border-t-orange-500/50 shadow-glow-orange' 
            : 'border-t border-t-coder1-cyan/50 shadow-glow-cyan'
        }`}
        style={{ 
          height: spacing.terminalHeader.height,
          backgroundColor: planningMode ? 'rgba(234, 179, 8, 0.05)' : undefined
        }}
      >
        {/* Left section - Edit mode and settings */}
        <div className="flex items-center gap-2">
          {/* Voice-to-text button */}
          <button
            data-tour="voice-input-button"
            onClick={toggleVoiceRecognition}
            className={`terminal-control-btn p-1.5 rounded-md ${voiceListening ? 'bg-red-600 bg-opacity-20' : ''}`}
            title={voiceListening ? 'Stop voice input (LISTENING)' : 'Start voice-to-text'}
          >
            {voiceListening ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* MCP Manager Button - HIDDEN for alpha (causes freeze, see POST-ALPHA-mcp-manager-fix.md) */}
          {/* TODO: Fix render loop in useMCPManager hooks before re-enabling
          <button
            onClick={() => {
              console.log('[MCP] Button clicked! Current isOpen:', isMCPOverlayOpen);
              toggleMCPOverlay();
              console.log('[MCP] toggleMCPOverlay called');
            }}
            className={`terminal-control-btn p-1.5 rounded-md transition-all relative ${
              isMCPOverlayOpen
                ? 'terminal-btn-active-orange'
                : 'hover:bg-bg-tertiary'
            }`}
            title="MCP Servers"
          >
            <Boxes className={`w-4 h-4 ${isMCPOverlayOpen ? 'text-orange-400' : 'text-text-secondary'}`} />
            {mcpEnabledCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 text-[9px] font-medium bg-orange-500 text-white rounded-full flex items-center justify-center">
                {mcpEnabledCount}
              </span>
            )}
          </button>
          */}

          {/* Compose Icon Button - Only show when staged composer is enabled */}
          {ENABLE_STAGED_COMPOSER && (
            <button
              onClick={() => setComposerVisible(true)}
              className={`terminal-control-btn p-1.5 rounded-md transition-all ${
                composerVisible 
                  ? 'terminal-btn-active-orange' 
                  : 'hover:bg-bg-tertiary'
              }`}
              title="Open Command Center (Ctrl+Space)"
            >
              <Edit3 className={`w-4 h-4 ${composerVisible ? 'text-orange-400' : 'text-text-secondary'}`} />
            </button>
          )}

          {/* Terminal Settings */}
          <TerminalSettings
            selectedClaudeModel={selectedClaudeModel}
            setSelectedClaudeModel={handleModelChange}
            showModelDropdown={showModelDropdown}
            setShowModelDropdown={setShowModelDropdown}
            audioAlertsEnabled={audioAlertsEnabled}
            setAudioAlertsEnabled={setAudioAlertsEnabled}
            selectedSoundPreset={selectedSoundPreset}
            setSelectedSoundPreset={setSelectedSoundPreset}
            showSoundPresetDropdown={showSoundPresetDropdown}
            setShowSoundPresetDropdown={setShowSoundPresetDropdown}
            soundButtonRef={soundButtonRef}
            soundDropdownRef={soundDropdownRef}
            terminalSettings={terminalSettings}
            setTerminalSettings={setTerminalSettings}
            xtermRef={xtermRef}
          />

          {/* Model Indicator */}
          <ModelIndicator />
        </div>

        {/* Right section - All terminal control buttons */}
        <div className="flex items-center gap-2">
          {/* Emergency Stop - Only when agents running (Nov 26, 2025) */}
          {activeAgentCount > 0 && (
            <button
              onClick={handleEmergencyStop}
              disabled={isStoppingAgents}
              className="terminal-control-btn p-1.5 rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-red-500/50"
              title={`Emergency stop ${activeAgentCount} running agents`}
            >
              🛑
            </button>
          )}

          {/* AI Team button - Opens Teams panel in right sidebar */}
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('switchToTeamsTab'));
              window.dispatchEvent(new CustomEvent('expandRightPanel'));
            }}
            className="terminal-control-btn flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-coder1-cyan/20"
            title="Open Agent Teams panel"
          >
            {(agentsRunning || (activeTeam && activeTeam.status !== 'completed' && activeTeam.status !== 'error')) && (
              <span className="w-2 h-2 rounded-full bg-coder1-cyan animate-pulse" />
            )}
            <Users className="w-4 h-4" />
            <span>AI Team</span>
          </button>

          {/* Enhanced Supervision button */}
          <button
            data-tour="supervision-button"
            onClick={() => {
              if (isSupervisionActive) {
                // If supervision is active, disable it
                toggleSupervision();
                xtermRef.current?.writeln('\r\n👁️ AI Supervision Disabled');
                xtermRef.current?.writeln('Manual oversight mode restored.');
              } else {
                // If not active, open configuration modal
                setConfigModalOpen(true);
                xtermRef.current?.writeln('\r\n🧠 Opening AI Supervision Configuration...');
                xtermRef.current?.writeln('Program your custom supervision bot for this project.');
              }
            }}
            className="terminal-control-btn flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md"
            title="AI monitors and guides your work"
          >
            <Eye className="w-4 h-4" />
            <span>Supervision</span>
          </button>


          {/* Sandbox Button */}
          <button
            onClick={handleSandboxAction}
            className="terminal-control-btn flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md"
            title="Create new sandbox workspace for isolated development"
          >
            <Plus className="w-4 h-4" />
            <span>Sandbox</span>
          </button>

        </div>
      </div>

      {/* Time Capsule Prompt - Feature-gated inline notification */}
      {features().timeCapsules && TimeCapsulePrompt && timeCapsuleCommit && (
        <TimeCapsulePrompt
          commitSha={timeCapsuleCommit.sha}
          commitMessage={timeCapsuleCommit.message}
          sessionDuration={timeCapsuleCommit.duration}
          onSave={async () => {
            try {
              // Truncate transcript client-side (1MB limit)
              const MAX_TRANSCRIPT = 1024 * 1024;
              let transcript = terminalHistory || '';
              if (transcript.length > MAX_TRANSCRIPT) {
                transcript = transcript.slice(-MAX_TRANSCRIPT);
              }

              const repoPath = timeCapsuleCommit.repoPath || workingDirectory || 'unknown';

              const resp = await fetch('/api/time-capsules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  repository_path: repoPath,
                  commit_sha: timeCapsuleCommit.sha,
                  commit_message: timeCapsuleCommit.message,
                  commit_branch: timeCapsuleCommit.branch,
                  duration_seconds: Math.round(timeCapsuleCommit.duration / 1000),
                  session_start_time: timeCapsuleCommit.claudeSessionStart,
                  agent_name: 'Claude Code',
                  user_id: authUser?.id || null,
                  transcript,
                }),
              });
              if (!resp.ok) throw new Error('Failed to save');

              // Trigger bridge to write capsule to git metadata branch
              const capsuleData = await resp.json();
              if (capsuleData.success && capsuleData.capsule && socketRef.current) {
                socketRef.current.emit('time_capsule:create', {
                  repoPath,
                  commitSha: timeCapsuleCommit.sha,
                  capsuleId: capsuleData.capsule.id,
                  capsuleData: capsuleData.capsule,
                });
              }
            } catch (err) {
              console.error('[Time Capsule] Save failed:', err);
              throw err;
            }
          }}
          onDismiss={() => setTimeCapsuleCommit(null)}
        />
      )}

      {/* Terminal Content - Let xterm.js handle scrolling */}
      <div
        className="flex-1 relative overflow-auto"
        style={{
          backgroundColor: '#0a0a0a'
        }}
        onClick={() => {
          // Focus the terminal when clicked
          if (xtermRef.current) {
            xtermRef.current.focus();
          }
        }}
      >
        <div 
          ref={terminalRef} 
          data-tour="terminal-input"
          onContextMenu={handleContextMenu}
          style={{
            width: '100%',
            height: '100%'
          }}
        />
      </div>

      {/* Claude Activity Indicator - Positioned directly under prompt box */}
      {claudeActive && (
        <div 
          className="flex items-center justify-center px-4 py-1"
          style={{
            height: '32px',
            position: 'relative',
            flexShrink: 0
          }}
        >
          <span className="text-orange-300 font-bold animate-pulse text-sm">Claude is thinking...</span>
        </div>
      )}

      {/* Error Doctor removed to fix terminal overlap issue */}

      {/* Supervision Configuration Modal */}
      <SupervisionConfigModal 
        isOpen={isConfigModalOpen}
        onClose={() => setConfigModalOpen(false)}
        onSave={saveConfiguration}
        currentConfig={activeConfiguration}
        templates={templates}
      />
      
      {/* Claude Copy Button - appears when files are dropped */}
      {showClaudeCopyButton && (
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(claudeCopyContent);
              
              // Show success in terminal with clear paste instructions
              if (xtermRef.current) {
                xtermRef.current.writeln('\r\n\x1b[32m✅ FILES COPIED!\x1b[0m');
                xtermRef.current.writeln('\x1b[36m📋 Next:\x1b[0m Press \x1b[33mCmd+V\x1b[0m (Mac) or \x1b[33mCtrl+V\x1b[0m (PC) to paste in Claude Code');
                xtermRef.current.writeln('\x1b[2m   Or click in any text field and paste\x1b[0m\r\n');
              }
              
              // Hide button after successful copy
              setTimeout(() => {
                setShowClaudeCopyButton(false);
              }, 2000);
            } catch (err) {
              console.error('Failed to copy:', err);
              if (xtermRef.current) {
                xtermRef.current.writeln('\r\n\x1b[31m❌ Copy failed. Please try again.\x1b[0m\r\n');
              }
            }
          }}
          className="absolute px-2 py-1 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-medium rounded shadow hover:shadow-md transition-all duration-150 flex items-center gap-1 z-50 border border-cyan-400"
          title="Copy files for Claude Code"
          style={{
            position: 'absolute',
            // Simple, predictable positioning in terminal area
            bottom: '20px', // Close to bottom of terminal
            right: '20px',  // Right side, clearly visible
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            pointerEvents: 'auto',
            zIndex: 1000    // Ensure it's above everything
          }}
        >
          <svg 
            className="w-3 h-3" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" 
            />
          </svg>
          <span className="text-xs">Copy</span>
        </button>
      )}
      
      {/* Phase 2: Scroll to bottom button - appears when user has scrolled up OR Claude is active */}
      {(isUserScrolled || claudeActive) && (
        <button
          onClick={() => {
            if (xtermRef.current) {
              try {
                // First try standard method
                xtermRef.current.scrollToBottom();
                
                // Check if it worked, if not force sync
                if (xtermRef.current.buffer && xtermRef.current.buffer.active) {
                  const buffer = xtermRef.current.buffer.active;
                  if (buffer.viewportY !== buffer.baseY) {
                    xtermRef.current.scrollLines(buffer.baseY - buffer.viewportY);
                  }
                }
                
                setIsUserScrolled(false);
              } catch (error) {
                // Silently handle scroll errors
              }
            }
          }}
          className={`
            scroll-to-follow-btn absolute bottom-24 right-4 px-4 py-2.5 rounded-lg 
            flex items-center gap-2 text-sm font-medium shadow-lg z-50 transition-all
            ${claudeActive 
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white animate-pulse' 
              : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
            }
          `}
          title={claudeActive ? "Claude is active - click to follow output (Ctrl+End)" : "Scroll to bottom and follow output (Ctrl+End)"}
        >
          <ChevronDown className={`w-4 h-4 ${claudeActive ? 'animate-bounce' : ''}`} />
          <span>{claudeActive ? 'Follow Claude' : 'Follow Output'}</span>
        </button>
      )}

      {/* UNIFIED RESTORATION OVERLAY - Handles both Reconnecting and Restoring states */}
      {restorationState !== 'hidden' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg-primary/60 backdrop-blur-md transition-all duration-300">
          <div className="flex flex-col items-center gap-4 p-8 rounded-xl bg-bg-secondary/90 border border-border-default shadow-2xl">
            <Loader2 className="w-10 h-10 text-coder1-cyan animate-spin" />
            <div className="flex flex-col items-center gap-1">
              <div className="text-base font-semibold text-text-primary">
                {restorationState === 'reconnecting' ? 'Connection Lost' : 'Restoring Session'}
              </div>
              <div className="text-sm text-text-secondary">
                {restorationState === 'reconnecting' ? 'Reconnecting to server...' : 'Syncing history...'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Footer Section - Contains metrics and status */}
      {/* Token stats and enhanced statusline removed — token parser
          can't reliably extract data from Claude CLI's ANSI TUI output */}

      {/* Status Line - Fixed positioning without covering content */}
      {(() => {
        const isEnabled = terminalSettings.statusLine.enabled;
        logger.debug('[Terminal] Status line check:', { 
          enabled: isEnabled, 
          settings: terminalSettings.statusLine,
          shouldShow: isEnabled 
        });
        return isEnabled;
      })() && (
        <div 
          className="border-t border-border-default px-4 py-2 text-xs text-text-secondary flex items-center justify-between" 
          style={{ 
            position: 'relative', 
            height: '40px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)', 
            backdropFilter: 'blur(8px)',
            flexShrink: 0
          }}
        >
          <div className="flex items-center gap-4">
            {terminalSettings.statusLine.showFile && (
              <div className="flex items-center gap-1">
                <span className="text-coder1-cyan">📁</span>
                <span>{currentFile || 'No file selected'}</span>
              </div>
            )}
            {terminalSettings.statusLine.showModel && (
              <div className="flex items-center gap-1">
                <span className="text-coder1-cyan">🤖</span>
                <span>Claude Sonnet 3.5</span>
              </div>
            )}
          </div>
          {terminalSettings.statusLine.showTokens && (
            <div className="flex items-center gap-1">
              <span className="text-coder1-cyan">💬</span>
              <span>{sessionTokens} tokens</span>
            </div>
          )}
        </div>
      )}

      {/* Staged Composer Overlay */}
      <StagedComposer
        isVisible={composerVisible}
        onClose={() => {
          setComposerVisible(false);
          setStagedCommand('');
          // Focus terminal when closing
          if (xtermRef.current) {
            xtermRef.current.focus();
          }
        }}
        onSend={handleSendStagedCommand}
        currentCommand={stagedCommand}
        sessionId={sessionId || ''}
        isProcessing={isProcessingCommand || claudeActive}
        planningMode={planningMode}
        onPlanningModeToggle={() => {
          setPlanningMode(!planningMode);
          if (!planningMode) {
            // Entering planning mode
            xtermRef.current?.writeln('\r\n\x1b[33m📋 PLANNING MODE ACTIVATED\x1b[0m');
            xtermRef.current?.writeln('Commands will be collected but not executed until you disable planning mode.\r\n');
          } else {
            // Exiting planning mode
            if (plannedCommands.length > 0) {
              xtermRef.current?.writeln('\r\n\x1b[32m✅ PLANNING MODE DISABLED\x1b[0m');
              xtermRef.current?.writeln(`You have ${plannedCommands.length} planned commands. Execute them now? (y/n)`);
            } else {
              xtermRef.current?.writeln('\r\n\x1b[32m✅ PLANNING MODE DISABLED\x1b[0m\r\n');
            }
          }
        }}
      />
      
      {/* Context Menu */}
      {contextMenuVisible && (
        <div 
          className="fixed z-[1000000] bg-bg-secondary border border-border-primary rounded-md shadow-lg py-1"
          style={{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`,
          }}
        >
          <button
            className="w-full px-4 py-2 text-left hover:bg-bg-tertiary text-text-primary text-sm"
            onClick={handleSaveAsMarkdown}
          >
            Save Session as Markdown
          </button>
        </div>
      )}
      
      {/* Error Doctor Modal - Completely separate from terminal layout */}
      {showErrorDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowErrorDoctorModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-bg-secondary border border-border-default rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-default">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-coder1-cyan" />
                <h2 className="text-lg font-semibold">Error Doctor</h2>
                {hasActiveError && (
                  <span className="text-xs text-red-400">(Active Error)</span>
                )}
              </div>
              <button
                onClick={() => setShowErrorDoctorModal(false)}
                className="text-text-secondary hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <ErrorDoctor 
                lastError={lastError}
                isActive={true}
              />
              
              {/* Terminal Error History */}
              {errorHistory.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border-default">
                  <h3 className="text-sm font-medium mb-2">🖥️ Terminal Errors</h3>
                  <div className="space-y-1">
                    {errorHistory.map((error, idx) => (
                      <div key={idx} className="text-xs text-text-muted">
                        <div className="truncate">
                          {error.length > 80 ? `${error.substring(0, 80)}...` : error}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Console Errors */}
              {consoleErrors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border-default">
                  <h3 className="text-sm font-medium mb-2">🌐 Console Errors</h3>
                  <div className="space-y-2">
                    {consoleErrors.slice(-5).map((error) => (
                      <div key={error.id} className="text-xs border-l-2 border-red-500/50 pl-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            error.type === 'error' ? 'bg-red-900/50 text-red-300' :
                            error.type === 'warn' ? 'bg-yellow-900/50 text-yellow-300' :
                            'bg-blue-900/50 text-blue-300'
                          }`}>
                            {error.type}
                          </span>
                          <span className="text-text-muted">
                            {new Date(error.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-text-secondary">
                          {error.message.length > 100 ? `${error.message.substring(0, 100)}...` : error.message}
                        </div>
                      </div>
                    ))}
                    {consoleErrors.length > 5 && (
                      <div className="text-xs text-text-muted text-center">
                        ... and {consoleErrors.length - 5} more console errors
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* No Errors State */}
              {errorHistory.length === 0 && consoleErrors.length === 0 && (
                <div className="text-center text-text-muted py-4">
                  <div className="text-2xl mb-2">✨</div>
                  <div>No errors detected!</div>
                  <div className="text-xs mt-1">Terminal and console are clean</div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="flex justify-between items-center p-4 border-t border-border-default">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setHasActiveError(false);
                    setErrorHistory([]);
                    consoleCaptureService.clearErrors();
                    setConsoleErrors([]);
                  }}
                  className="px-3 py-1.5 text-sm rounded-md bg-bg-tertiary hover:bg-bg-primary"
                >
                  Clear All
                </button>
              </div>
              
              <div className="flex gap-2">
                {/* Send to Claude Code Button - Always visible for better UX */}
                <button
                  onClick={async () => {
                    const hasErrors = errorHistory.length > 0 || consoleErrors.length > 0;
                    
                    // If no errors, show helpful message
                    if (!hasErrors) {
                      addToast('ℹ️ No errors to send. Generate some errors first, then try again.', 'info');
                      
                      // Enable debug mode for better capture
                      consoleCaptureService.enableDebugMode();
                      return;
                    }
                    
                    setIsAnalyzingWithClaude(true);
                    try {
                        // Prepare error report for Claude Code
                        const terminalErrors = errorHistory.join('\n\n');
                        const consoleErrorReport = consoleErrors.map(error => 
                          `[${error.type.toUpperCase()}] ${error.timestamp}\n${error.message}`
                        ).join('\n\n');
                        
                        const fullReport = `CODER1 IDE ERROR REPORT
Generated: ${new Date().toISOString()}

📱 TERMINAL ERRORS (${errorHistory.length}):
${terminalErrors || 'No terminal errors'}

🌐 CONSOLE ERRORS (${consoleErrors.length}):
${consoleErrorReport || 'No console errors'}

📝 ANALYSIS REQUEST:
Please analyze these errors and provide:
1. Root cause analysis
2. Step-by-step fix recommendations
3. Prevention strategies
4. Any related documentation or resources

Context: Running in Coder1 IDE development environment`;

                        // Check if Claude Code is active and send directly
                        if (claudeActive && socket?.connected && sessionId) {
                          // Send directly to active Claude Code session
                          socket.emit('terminal:input', {
                            id: sessionId,
                            data: fullReport + '\r',
                            selectedClaudeModel: useModelStore.getState().selectedModel,
                            skipPermissions: terminalSettings.skipPermissions
                          });
                          addToast('✅ Error report sent to Claude Code for analysis!', 'success');
                        } else {
                          // Fallback: Copy to clipboard if Claude not active
                          await navigator.clipboard.writeText(fullReport);
                          if (!claudeActive) {
                            addToast('📋 Claude Code not active. Error report copied to clipboard - type "claude" first, then paste.', 'info');
                          } else {
                            addToast('📋 Terminal not connected. Error report copied to clipboard.', 'info');
                          }
                        }
                        
                      } catch (error) {
                        console.error('Failed to send errors to Claude Code:', error);
                        addToast('❌ Failed to prepare error report', 'error');
                      } finally {
                        setIsAnalyzingWithClaude(false);
                      }
                    }}
                    disabled={isAnalyzingWithClaude}
                    className="px-4 py-1.5 text-sm rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isAnalyzingWithClaude ? (
                      <>
                        <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        Send to Claude Code
                      </>
                    )}
                  </button>
                
                <button
                  onClick={() => setShowErrorDoctorModal(false)}
                  className="px-3 py-1.5 text-sm rounded-md bg-coder1-cyan text-black hover:bg-coder1-cyan-hover"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sandbox Panel Modal */}
      {showSandboxPanel && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          {/* Backdrop with blur */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSandboxPanel(false)}
          />

          {/* Modal Container */}
          <div className="relative z-50 w-full max-w-4xl h-[80vh] bg-bg-secondary border-2 border-coder1-cyan/50 rounded-lg shadow-2xl overflow-hidden"
               style={{ boxShadow: '0 0 40px rgba(0, 217, 255, 0.3)' }}>
            {/* Close Button */}
            <button
              onClick={() => setShowSandboxPanel(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-bg-tertiary hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors"
              title="Close Sandbox Panel"
            >
              <X className="w-5 h-5" />
            </button>

            {/* SandboxPanel Component */}
            <div className="h-full overflow-hidden">
              <SandboxPanel onRequestClose={() => setShowSandboxPanel(false)} />
            </div>
          </div>
        </div>
      )}

      {/* MCP Manager Overlay */}
      <MCPOverlay isOpen={isMCPOverlayOpen} onClose={closeMCPOverlay} />
    </div>
  );
}

// Model Indicator Component - Shows current Claude model selection
function ModelIndicator() {
  // ✅ Use selector pattern for Zustand reactivity
  const displayName = useModelStore(state => state.getModelDisplayName());
  const selectedModel = useModelStore(state => state.selectedModel);
  
  return (
    <div 
      className="flex items-center gap-1.5 px-2 py-1 rounded bg-bg-tertiary border border-border-default"
      title={`Current model: ${selectedModel}`}
    >
      <Zap className="w-3.5 h-3.5 text-coder1-cyan" />
      <span className="text-xs font-medium text-text-secondary">
        {displayName}
      </span>
    </div>
  );
}
