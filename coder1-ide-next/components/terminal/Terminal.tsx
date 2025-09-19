'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import './Terminal.css'; // Re-enabled - critical for xterm viewport fixes
import { Users, Zap, StopCircle, Brain, Eye, Code2, Mic, MicOff, Speaker, ChevronDown, Plus } from '@/lib/icons';
import TerminalSettings, { TerminalSettingsState } from './TerminalSettings';
import { glows, spacing } from '@/lib/design-tokens';
import { getSocket } from '@/lib/socket';
// import ErrorDoctor from './ErrorDoctor'; // Removed to fix terminal overlap issue
import { soundAlertService, SoundPreset } from '@/lib/sound-alert-service';
import { useEnhancedSupervision } from '@/contexts/EnhancedSupervisionContext';
import SupervisionConfigModal from '@/components/supervision/SupervisionConfigModal';
import { useSessionMemory } from '@/hooks/useSessionMemory';
import { useUIStore } from '@/stores/useUIStore';
import { filterThinkingAnimations, extractClaudeCommands } from '@/lib/checkpoint-utils';

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
  sandboxMode?: boolean;
  sandboxSession?: {
    id: string;
    name: string;
    checkpointData: any;
    terminalHistory?: string;
    createdAt: Date;
  }; // Session data from checkpoint
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
export default function Terminal({ onAgentsSpawn, onTerminalClick, onClaudeTyped, onTerminalData, onTerminalCommand, onTerminalReady, sandboxMode = false, sandboxSession }: TerminalProps) {
  // REMOVED: // REMOVED: console.log('🖥️ Terminal component rendering...');
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdForVoiceRef = useRef<string | null>(null); // Move this up here
  const sessionCreatedRef = useRef(false); // Track if session was already created
  const onDataDisposableRef = useRef<any>(null); // Store onData disposable
  const connectionInProgressRef = useRef(false); // Prevent concurrent connections
  const [isConnected, setIsConnected] = useState(false);
  const [agentsRunning, setAgentsRunning] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  
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
  const [thinkingMode, setThinkingMode] = useState<'normal' | 'think' | 'think_hard' | 'ultrathink'>('normal');
  const [showThinkingDropdown, setShowThinkingDropdown] = useState(false);
  const [audioAlertsEnabled, setAudioAlertsEnabled] = useState(false);
  const [recognition, setRecognition] = useState<any | null>(null);
  const [claudeActive, setClaudeActive] = useState(false);
  const claudeActivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [conversationMode, setConversationMode] = useState(false);
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
  
  // Memory system integration
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const memory = useSessionMemory({
    enabled: memoryEnabled,
    sessionId: sessionIdForVoiceRef.current || `alpha_session_${Date.now()}`,
    platform: 'Claude Code',
    autoInject: true
  });
  
  // UI Store for toasts
  const { addToast } = useUIStore();
  
  // Sandbox creation state
  const [sandboxCreationStatus, setSandboxCreationStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [sandboxCreationMessage, setSandboxCreationMessage] = useState<string>('');
  const [createdSandboxId, setCreatedSandboxId] = useState<string>('');
  
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
    
    // Fetch immediately and then every 60 seconds
    fetchMCPStatus();
    const interval = setInterval(fetchMCPStatus, 60000);
    
    return () => clearInterval(interval);
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [terminalReady, setTerminalReady] = useState(false);
  
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
  const [lastError, setLastError] = useState<string | null>(null);
  const [errorDoctorActive, setErrorDoctorActive] = useState(true);
  const socketRef = useRef<any>(null); // Will be Socket instance after async init
  const [currentLineBuffer, setCurrentLineBuffer] = useState('');
  const [selectedSoundPreset, setSelectedSoundPreset] = useState<SoundPreset>('gentle');
  const [showSoundPresetDropdown, setShowSoundPresetDropdown] = useState(false);
  const soundButtonRef = useRef<HTMLButtonElement>(null);
  const soundDropdownRef = useRef<HTMLDivElement>(null);
  const [showMemoryDropdown, setShowMemoryDropdown] = useState(false);
  const memoryDropdownRef = useRef<HTMLDivElement>(null);
  
  // Scroll tracking - Phase 1: Read-only monitoring
  const [isUserScrolled, setIsUserScrolled] = useState(false);
  const scrollCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Phase 4: Debouncing for flicker reduction
  const scrollDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Output buffering for performance optimization
  const outputBufferRef = useRef<string[]>([]);
  const outputFlushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const writeRAFRef = useRef<number | null>(null);

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
    
    const createTerminalSession = async () => {
      // Always create a fresh terminal session on page load
      // This ensures terminal starts clean on refresh
      
      sessionCreatedRef.current = true;
      // REMOVED: // REMOVED: console.log('🚀 CREATING TERMINAL SESSION...');
      
      try {
        // Create a real terminal session via the backend
        // REMOVED: // REMOVED: console.log('📡 Calling /api/terminal-rest/sessions...');
        const response = await fetch('/api/terminal-rest/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cols: 130,
            rows: 30,
            sandbox: sandboxMode,
            checkpointName: sandboxSession?.name || 'Sandbox Session'
          }),
        });
        
        // REMOVED: // REMOVED: console.log('📡 Session response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          // REMOVED: // REMOVED: console.log('📡 Session response data:', data);
          setSessionId(data.sessionId);
          // Immediately update the ref for voice recognition
          sessionIdForVoiceRef.current = data.sessionId;
          setTerminalReady(true);
          // Notify parent component - performance-safe callback
          notifyTerminalReady(data.sessionId, true);
          // REMOVED: // REMOVED: console.log('✅ Terminal session created:', data.sessionId);
        } else {
          // logger?.error('Failed to create terminal session:', response.status);
          // Fallback to simulated mode
          const simulatedId = 'simulated-' + Date.now();
          setSessionId(simulatedId);
          sessionIdForVoiceRef.current = simulatedId;
          setTerminalReady(true);
          // Notify parent component - performance-safe callback
          notifyTerminalReady(simulatedId, true);
        }
      } catch (error) {
        // logger?.error('Error creating terminal session:', error);
        // Fallback to simulated mode
        const simulatedId = 'simulated-' + Date.now();
        setSessionId(simulatedId);
        sessionIdForVoiceRef.current = simulatedId;
        setTerminalReady(true);
        // Notify parent component - performance-safe callback
        notifyTerminalReady(simulatedId, true);
      }
    };
    
    createTerminalSession();
    
    // Cleanup function
    return () => {
      // Session cleanup will be handled in separate effect
    };
  }, []);
  
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
      
      // Clean up output buffering timers
      if (outputFlushTimeoutRef.current) {
        clearTimeout(outputFlushTimeoutRef.current);
        outputFlushTimeoutRef.current = null;
      }
      
      if (writeRAFRef.current) {
        cancelAnimationFrame(writeRAFRef.current);
        writeRAFRef.current = null;
      }
      
      // Clear output buffer
      outputBufferRef.current = [];
      
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
        console.log('🧹 Terminal component cleanup (HTTP DELETE disabled):', currentSessionId);
        console.log('📝 Sessions are managed by unified server memory management');
        
        // Only perform local component cleanup - no HTTP requests
        // The unified server will handle session cleanup automatically
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // This useEffect has been removed to prevent duplicate socket connections
  // All socket connection logic is now handled in connectToBackend function

  useEffect(() => {
    // REMOVED: // REMOVED: console.log('🖥️ INITIALIZING XTERM...');
    if (!terminalRef.current) {
      // REMOVED: // REMOVED: console.log('❌ Terminal ref not ready');
      return;
    }

    try {
      // REMOVED: // REMOVED: console.log('🔧 Creating XTerm instance...');
      // Initialize terminal with performance-optimized settings
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
        scrollback: 10000, // Limit scrollback buffer
        fastScrollModifier: 'ctrl', // Enable fast scrolling with Ctrl key
        smoothScrollDuration: 0, // Disable smooth scrolling animations
        scrollOnUserInput: true,
        scrollSensitivity: 1,
        // Enhanced scrolling for better bottom access
        minimumContrastRatio: 1, // Ensures all content is visible
        allowTransparency: false, // Improve rendering consistency
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      
      // Ensure the container is ready before opening
      if (terminalRef.current && terminalRef.current.offsetParent !== null) {
        term.open(terminalRef.current);
        
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
            if (process.env.NODE_ENV !== 'production' || sandboxMode) {
              term.clear();
              if (sandboxMode) {
                console.log('🎯 Terminal: Sandbox mode with session:', sandboxSession);
                
                // Display checkpoint terminal history if available
                if (sandboxSession?.terminalHistory) {
                  // Clean the terminal history to remove thinking animations and control sequences
                  const cleanedHistory = filterThinkingAnimations(sandboxSession.terminalHistory);
                  
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
                  term.writeln('\x1b[38;5;245mNo terminal history available in this checkpoint.\x1b[0m');
                }
                
                if (sandboxSession?.checkpointData) {
                  const data = sandboxSession.checkpointData;
                  console.log('📊 Terminal: Checkpoint data:', data);
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
                term.writeln('Coder1 Terminal Ready');
                term.writeln("Type 'claude' to start AI-assisted coding");
                term.writeln('──────────────────────────────────────────────');
                term.writeln('');
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
        
        // Set up scroll interval - reduced frequency for better performance
        scrollCheckIntervalRef.current = setInterval(checkScrollPosition, 500); // Reduced to 500ms to prevent aggressive scrolling

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
          if (fitAddonRef.current && term) {
            try {
              const beforeBuffer = term.buffer?.active;
              const wasAtBottom = beforeBuffer ? beforeBuffer.viewportY === beforeBuffer.baseY : false;

              setTimeout(() => {
                fitAddonRef.current?.fit();
                
                // Check state after resize
                const afterBuffer = term.buffer?.active;
                
                // If resize broke the viewport sync and we were at bottom, fix it
                if (wasAtBottom && afterBuffer && afterBuffer.viewportY !== afterBuffer.baseY) {
                  term.scrollLines(afterBuffer.baseY - afterBuffer.viewportY);
                }
                
                // If we were at bottom before resize, ensure we stay at bottom
                if (wasAtBottom) {
                  // Small delay to let DOM settle
                  setTimeout(() => {
                    term.scrollToBottom();
                  }, 50);
                }
              }, 10);
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
            // Clear any pending buffer
            outputBufferRef.current = [];
            // Dispose of onData handler
            if (onDataDisposableRef.current) {
              onDataDisposableRef.current.dispose();
              onDataDisposableRef.current = null;
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
      // logger?.error('Terminal initialization error:', error);
      // Set up a basic fallback
      if (terminalRef.current) {
        terminalRef.current.innerHTML = '<div style="color: #ff6b6b; padding: 20px;">Terminal initialization failed. Please refresh the page.</div>';
      }
    }
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showThinkingDropdown) {
        setShowThinkingDropdown(false);
      }
      if (showSoundPresetDropdown && 
          soundDropdownRef.current && 
          !soundDropdownRef.current.contains(event.target as Node) &&
          soundButtonRef.current &&
          !soundButtonRef.current.contains(event.target as Node)) {
        setShowSoundPresetDropdown(false);
      }
      if (showMemoryDropdown && 
          memoryDropdownRef.current && 
          !memoryDropdownRef.current.contains(event.target as Node)) {
        setShowMemoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showThinkingDropdown, showSoundPresetDropdown, showMemoryDropdown]);

  // Load sound preferences
  useEffect(() => {
    setAudioAlertsEnabled(soundAlertService.getEnabled());
    setSelectedSoundPreset(soundAlertService.getPreset());
  }, []);

  // Keep sessionId ref in sync for voice callbacks
  useEffect(() => {
    sessionIdForVoiceRef.current = sessionId;
    // REMOVED: // REMOVED: console.log('📝 Updated sessionIdForVoiceRef:', sessionId);
  }, [sessionId]);

  // Connect to backend when both terminal and session are ready
  useEffect(() => {
    // Don't connect to backend if in sandbox mode - it's read-only
    if (sandboxMode) {
      console.log('🏖️ Sandbox mode - skipping backend connection');
      return;
    }
    
    if (sessionId && terminalReady && xtermRef.current && !isConnected && !connectionInProgressRef.current) {
      // REMOVED: // REMOVED: console.log('🚀 Both terminal and session ready, connecting to backend...');
      connectToBackend(xtermRef.current);
    }
  }, [sessionId, terminalReady, isConnected, sandboxMode]);

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

  // Store isConnected in a ref for use in callbacks
  const isConnectedRef = useRef(false);
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  // Auto-focus terminal when component mounts and after interactions
  useEffect(() => {
    // Focus terminal after a short delay to ensure DOM is ready
    const focusTimer = setTimeout(() => {
      if (xtermRef.current && terminalRef.current) {
        try {
          xtermRef.current.focus();
          console.log('✅ Terminal auto-focused on mount');
        } catch (error) {
          console.warn('Could not auto-focus terminal:', error);
        }
      }
    }, 500);

    // Add global click handler to refocus terminal when clicked anywhere in terminal area
    const handleTerminalAreaClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is within terminal container
      if (terminalRef.current && terminalRef.current.contains(target)) {
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
  }, [terminalReady]);

  // Listen for checkpoint restoration events
  useEffect(() => {
    
    const handleCheckpointRestored = (event: CustomEvent) => {
      console.log('🔄 Terminal: Checkpoint restoration event received', event.detail);
      
      // For checkpointRestored event: { checkpoint, snapshot }
      const snapshot = event.detail?.snapshot;
      const terminalData = snapshot?.terminal;
      const conversationHistory = snapshot?.conversationHistory;
      
      if (!xtermRef.current) {
        console.log('⚠️ Terminal: Terminal not initialized yet');
        return;
      }
      
      // Clear current terminal
      xtermRef.current.clear();
      
      // ENHANCED: Display conversation history first if available
      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        console.log(`📚 Terminal: Restoring ${conversationHistory.length} previous conversations`);
        
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
        console.log(`📜 Terminal: Restoring current terminal session from checkpoint`);
        // Filter out thinking animations before writing
        const filteredData = filterThinkingAnimations(terminalData);
        // Write the filtered terminal string
        xtermRef.current.write(filteredData);
      } else {
        console.log('⚠️ Terminal: No current terminal data in checkpoint');
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
      // Without this, the terminal displays content but cannot accept keyboard input
      setTimeout(async () => {
        console.log('🔄 Terminal: Enhanced reconnection after checkpoint restoration...');
        
        // Clear any old session references that might cause conflicts
        const oldSessionId = sessionIdForVoiceRef.current || sessionId;
        if (oldSessionId) {
          console.log('🧹 Terminal: Clearing old session reference:', oldSessionId);
          // Add to failed cleanup list to prevent cleanup attempts
          failedCleanupSessionsRef.current.add(oldSessionId);
        }
        
        // Always create a fresh session after checkpoint restoration
        console.log('📡 Terminal: Creating fresh session for restored checkpoint...');
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
            
            console.log('✅ Terminal: Fresh session created after restoration:', newSessionId);
            
            // Only connect if we have a valid terminal instance and haven't connected already
            if (xtermRef.current && (!socketRef.current?.connected || !onDataDisposableRef.current)) {
              console.log('🔌 Terminal: Connecting to backend with fresh session...');
              await connectToBackend(xtermRef.current);
            } else {
              console.log('ℹ️ Terminal: Already connected or terminal not ready');
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
            console.log('🎯 Terminal: Focused and ready for input after restoration');
          }
        }, 500);
      }, 300); // Small delay to ensure terminal content is rendered first
    };
    
    const handleIdeStateChanged = (event: CustomEvent) => {
      if (event.detail?.type === 'checkpoint-restored') {
        // For ideStateChanged: event.detail.data IS the snapshot
        const terminalData = event.detail?.data?.terminal;
        
        if (!terminalData || typeof terminalData !== 'string') {
          console.log('⚠️ Terminal: No terminal data in ide state change');
          return;
        }
        
        if (!xtermRef.current) {
          console.log('⚠️ Terminal: Terminal not initialized yet');
          return;
        }
        
        // Clear and restore terminal
        xtermRef.current.clear();
        console.log(`📜 Terminal: Restoring terminal from IDE state change`);
        // Filter out thinking animations before writing
        const filteredData = filterThinkingAnimations(terminalData);
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
        console.log('🎯 Injecting Claude command into main terminal:', command);
        
        // Inject the command into the terminal as if the user typed it
        xtermRef.current.write('\r\n\x1b[38;5;214m🎯 Executing extracted command:\x1b[0m\r\n');
        xtermRef.current.write('$ ' + command + '\r\n');
        
        // Send the command to the backend
        socketRef.current.emit('terminal:input', { 
          id: sessionId, 
          data: command + '\r',
          thinkingMode 
        });
      }
    };
    
    window.addEventListener('checkpointRestored', handleCheckpointRestored as any);
    window.addEventListener('ideStateChanged', handleIdeStateChanged as any);
    window.addEventListener('terminal:injectCommand', handleInjectCommand as any);
    
    return () => {
      window.removeEventListener('checkpointRestored', handleCheckpointRestored as any);
      window.removeEventListener('ideStateChanged', handleIdeStateChanged as any);
      window.removeEventListener('terminal:injectCommand', handleInjectCommand as any);
    };
  }, [sessionId, thinkingMode]); // Removed sandboxMode dependency to prevent event listener churn

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
            xtermRef.current.writeln(`\r\n🎤 Voice: ${cleanTranscript}`);
            
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
                thinkingMode 
              });
              
              // Auto-execute for Claude commands  
              if (cleanTranscript.toLowerCase().includes('claude')) {
                xtermRef.current.write('\r\n');
                socket.emit('terminal:input', { 
                  id: currentSessionId, 
                  data: '\r',
                  thinkingMode 
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
          xtermRef.current.writeln(`\r\n❌ ${errorMessage}`);
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
              xtermRef.current.writeln('\r\n🎤 Voice input ended');
            }
          }
        } else {
          setVoiceListening(false);
          if (xtermRef.current) {
            xtermRef.current.writeln('\r\n🎤 Voice input ended');
          }
        }
      };
      
      setRecognition(recognitionInstance);
    } else {
      // logger?.warn('Speech recognition not supported in this browser');
    }
  }, []);

  const toggleVoiceRecognition = async () => {
    if (!recognition) {
      xtermRef.current?.writeln('\r\n❌ Speech recognition not supported in this browser');
      xtermRef.current?.writeln('Try using Chrome, Edge, or Safari for speech recognition');
      return;
    }
    
    if (voiceListening) {
      recognition.stop();
      setVoiceListening(false);
      xtermRef.current?.writeln('\r\n🎤 Voice input stopped');
    } else {
      try {
        // Request microphone permission first
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            xtermRef.current?.writeln('\r\n🎤 Microphone access granted');
          } catch (permError) {
            xtermRef.current?.writeln('\r\n❌ Microphone permission denied');
            xtermRef.current?.writeln('Please allow microphone access to use speech-to-text');
            return;
          }
        }
        
        // Check if we're on HTTPS (required for speech recognition in many browsers)
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
          xtermRef.current?.writeln('\r\n⚠️ Speech recognition may require HTTPS');
        }
        
        recognition.start();
        setVoiceListening(true);
        xtermRef.current?.writeln('\r\n🎤 Voice input started - speak now...');
        xtermRef.current?.writeln('Say your commands clearly. Speech will be converted to text.');
      } catch (error) {
        // logger?.error('Failed to start speech recognition:', error);
        setVoiceListening(false);
        xtermRef.current?.writeln('\r\n❌ Failed to start voice input');
        xtermRef.current?.writeln(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  // Input buffer for when socket is reconnecting (moved to component scope)
  const inputBufferRef = useRef<string[]>([]);
  const isProcessingBufferRef = useRef(false);
  
  // Function to process buffered input (moved to component scope)
  const processInputBuffer = useCallback(() => {
    const socket = socketRef.current;
    if (!isProcessingBufferRef.current && inputBufferRef.current.length > 0 && socket?.connected && sessionId) {
      isProcessingBufferRef.current = true;
      while (inputBufferRef.current.length > 0) {
        const bufferedData = inputBufferRef.current.shift();
        if (bufferedData) {
          socket.emit('terminal:input', { 
            id: sessionId, 
            data: bufferedData,
            thinkingMode 
          });
        }
      }
      isProcessingBufferRef.current = false;
    }
  }, [sessionId, thinkingMode]);

  const connectToBackend = async (term: XTerm) => {
    // REMOVED: // REMOVED: console.log('🔌 CONNECTING TO BACKEND:', { sessionId, terminalReady });
    
    // Prevent concurrent connections
    if (connectionInProgressRef.current) {
      // REMOVED: // REMOVED: console.log('⚠️ Connection already in progress, skipping...');
      return;
    }
    
    if (!sessionId || !terminalReady) {
      console.log('❌ Session not ready yet:', { sessionId, terminalReady });
      return;
    }
    
    // Validate session before attempting connection
    if (!validateCurrentSession()) {
      console.log('❌ Invalid session, cannot connect to backend:', sessionId);
      return;
    }
    
    // Mark connection as in progress
    connectionInProgressRef.current = true;

    // Get Socket.IO instance to connect to Express backend
    // REMOVED: // REMOVED: console.log('🔧 Getting Socket.IO instance...');
    const socket = await getSocket();
    // REMOVED: // REMOVED: console.log('✅ Socket.IO instance obtained:', socket.connected ? 'CONNECTED' : 'DISCONNECTED');
    socketRef.current = socket;
    
    // Focus terminal immediately when backend is connected
    const focusOnConnect = () => {
      if (term && !term.element?.contains(document.activeElement)) {
        setTimeout(() => {
          try {
            term.focus();
            console.log('✅ Terminal focused after backend connection');
          } catch (error) {
            console.warn('Could not focus terminal after connection:', error);
          }
        }, 100);
      }
    };

    // Add connection status listeners for debugging
    socket.on('connect', () => {
      // REMOVED: // REMOVED: console.log('🟢 Socket.IO CONNECTED to backend');
      // If reconnecting, re-establish terminal session
      if (isConnected && sessionId) {
        console.log('🔄 Reconnected - re-establishing terminal session');
        socket.emit('terminal:create', { id: sessionId });
        focusOnConnect();
      }
    });
    
    socket.on('disconnect', (reason) => {
      // REMOVED: // REMOVED: console.log('🔴 Socket.IO DISCONNECTED:', reason);
      if (term) {
        term.writeln(`\r\n⚠️ Connection lost: ${reason}`);
      }
    });
    
    socket.on('connect_error', (error) => {
      // logger?.error('❌ Socket.IO CONNECTION ERROR:', error);
    });

    // Join the terminal session
    // REMOVED: // REMOVED: console.log('📡 Emitting terminal:create for session:', sessionId);
    socket.emit('terminal:create', { id: sessionId });
    // REMOVED: // REMOVED: console.log('📡 Connecting to Express backend terminal:', sessionId);

    // Flush buffered output to terminal (performance optimization)
    const flushOutput = () => {
      if (outputBufferRef.current.length > 0 && term) {
        const output = outputBufferRef.current.join('');
        outputBufferRef.current = [];
        term.write(output);
        
        // Removed forced scroll to bottom to prevent aggressive scrolling
        // Users should be able to scroll up to read history without being forced down
        
        // Smart auto-scroll logic for better Claude session tracking
        if (term.buffer && term.buffer.active) {
          const buffer = term.buffer.active;
          const viewportY = buffer.viewportY;
          const baseY = buffer.baseY;
          
          // Calculate how far from bottom (in lines)
          const linesFromBottom = baseY - viewportY;
          
          // Smart auto-scroll conditions (less aggressive):
          // 1. If exactly at bottom
          // 2. If within 2 lines of bottom (very close)
          // 3. If Claude is active, only scroll if user hasn't manually scrolled
          const shouldAutoScroll = 
            viewportY === baseY || // Exactly at bottom
            linesFromBottom <= 2 || // Within 2 lines (very close)
            (claudeActive && linesFromBottom <= 5 && !isUserScrolled); // Claude active, only if not manually scrolled
          
          if (shouldAutoScroll) {
            term.scrollToBottom();
            // Reset user scroll flag only if we're at the very bottom
            if (isUserScrolled && linesFromBottom <= 1) {
              setIsUserScrolled(false);
            }
          }
        }
      }
      outputFlushTimeoutRef.current = null;
    };

    // Handle terminal output from backend
    socket.on('terminal:data', ({ id, data }: { id: string; data: string }) => {
      if (id === sessionId && term) {
        // Buffer the output for performance
        outputBufferRef.current.push(data);
        
        // Cancel any pending flush
        if (outputFlushTimeoutRef.current) {
          clearTimeout(outputFlushTimeoutRef.current);
        }
        
        // Detect Claude activity based on output patterns
        // Claude outputs typically have certain patterns or continuous streams
        if (data.length > 20 || data.includes('```') || data.includes('I\'ll') || data.includes('Let me')) {
          setClaudeActive(true);
          
          // Clear existing activity timeout
          if (claudeActivityTimeoutRef.current) {
            clearTimeout(claudeActivityTimeoutRef.current);
          }
          
          // Set new timeout - consider Claude inactive after 2 seconds of no output
          claudeActivityTimeoutRef.current = setTimeout(() => {
            setClaudeActive(false);
          }, 2000);
        }
        
        // Simplified flush: Always flush quickly for responsiveness
        // Use a very short timeout to batch rapid updates
        outputFlushTimeoutRef.current = setTimeout(flushOutput, 10);
        
        // Memory system: Track Claude interactions
        if (memory.isEnabled && sessionStorage.getItem('memory_context_injected') === 'true') {
          const lastCommand = sessionStorage.getItem('last_claude_command');
          if (lastCommand && data.length > 50) { // Only track substantial responses
            // Add interaction to memory
            memory.addInteraction(lastCommand, data, 'command').then(() => {
              // Clear the tracking flags
              sessionStorage.removeItem('last_claude_command');
              sessionStorage.removeItem('memory_context_injected');
            });
          }
        }
        
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
            
            // Line 3: Status and mode
            const mode = thinkingMode !== 'normal' ? `Mode: ${thinkingMode}` : 'Mode: normal';
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
        if (data.includes('error') || data.includes('Error') || data.includes('failed')) {
          // REMOVED: // REMOVED: console.log('❌ ERROR DETECTED:', data.substring(0, 100));
          setLastError(data);
        }
      }
    });

    // Handle terminal creation confirmation
    socket.on('terminal:created', ({ id }: { id: string }) => {
      if (id === sessionId) {
        // REMOVED: // REMOVED: console.log('✅ Terminal connected to Express backend');
        setIsConnected(true);
        
        // For sandbox mode, restore the terminal history from checkpoint
        if (sandboxMode && sandboxSession?.terminalHistory && term) {
          console.log('📜 Restoring terminal history for sandbox, length:', sandboxSession.terminalHistory.length);
          
          // Write the historical terminal content
          // Clean up any ANSI cursor movement sequences that might interfere
          const cleanedHistory = sandboxSession.terminalHistory
            .replace(/\x1b\[\?2004[hl]/g, '') // Remove bracketed paste mode
            .replace(/\x1b\[\d+[A-D]/g, '') // Remove cursor movement
            .replace(/\r\n\r\n\r\n+/g, '\r\n\r\n'); // Reduce excessive newlines
          
          // Write the history
          term.write(cleanedHistory);
          
          // Add a separator to show where history ends and new session begins
          term.write('\r\n\r\n');
          term.write('\x1b[38;5;174m══════════════════════════════════════════════════════════════════════════════\x1b[0m\r\n');
          term.write('\x1b[38;5;174m📂 Checkpoint restored - Continue from here\x1b[0m\r\n');
          term.write('\x1b[38;5;174m══════════════════════════════════════════════════════════════════════════════\x1b[0m\r\n');
          term.write('\r\n');
        } else if (!sandboxMode && term) {
          // Normal mode - just show connection message
          term.write('\r\n✅ Connected to backend terminal\r\n');
        }
        connectionInProgressRef.current = false; // Connection complete
        
        // Focus terminal after successful connection
        focusOnConnect();
        
        // Send initial resize
        if (fitAddonRef.current && xtermRef.current) {
          const { cols, rows } = xtermRef.current;
          socket.emit('terminal:resize', { id: sessionId, cols, rows });
        }
        
        // Process any buffered input after connection
        if (typeof processInputBuffer === 'function') {
          processInputBuffer();
        }
      }
    });

    // Handle errors
    socket.on('terminal:error', ({ message }: { message: string }) => {
      // logger?.error('Terminal error:', message);
      term.writeln(`\r\n❌ Terminal error: ${message}`);
      setIsConnected(false);
      connectionInProgressRef.current = false; // Connection failed
    });

    // Handle Claude session events
    socket.on('claude:output', ({ sessionId: claudeSessionId, data }: { sessionId: string; data: string }) => {
      if (term) {
        term.write(data);
      }
    });

    socket.on('claude:sessionComplete', ({ sessionId: claudeSessionId, duration }: { sessionId: string; duration: number }) => {
      if (term) {
        term.writeln(`\r\n✅ Claude session completed in ${(duration / 1000).toFixed(2)}s`);
        
        // Play sound alert if enabled and duration > 20s
        if (audioAlertsEnabled && duration > 20000) {
          soundAlertService.playCompletionAlert();
        }
      }
      setClaudeActive(false);
      setConversationMode(false);
    });

    socket.on('claude:error', ({ message }: { message: string }) => {
      if (term) {
        term.writeln(`\r\n❌ Claude Error: ${message}`);
      }
    });

    // Handle AI Team progress updates
    socket.on('ai-team:progress', (data: any) => {
      if (term && data.agent) {
        // Clear current line and write progress update
        term.write('\r\x1b[K'); // Clear current line
        term.writeln(`[${data.agent.name}] ${data.agent.currentTask} (${data.agent.progress}%)`);
        term.write('$ '); // Restore prompt
      }
    });

    // Handle AI Team completion
    socket.on('ai-team:complete', (data: any) => {
      if (term) {
        term.writeln(`\r\n✅ AI Team completed! Generated ${data.filesCount || 0} files`);
        term.write('$ ');
      }
    });

    // Set up terminal input handling - send to backend
    // Skip in sandbox mode - it's read-only
    if (sandboxMode) {
      console.log('🏖️ Sandbox mode - terminal is read-only');
      return;
    }
    
    // Clean up any existing handler first
    if (onDataDisposableRef.current) {
      onDataDisposableRef.current.dispose();
      onDataDisposableRef.current = null;
    }
    
    // Create new handler and store the disposable
    onDataDisposableRef.current = term.onData((data) => {
      // Check session validity first
      if (!sessionId) {
        term.writeln('\r\n⚠️ Terminal session not initialized. Please refresh the page.');
        return;
      }
      
      // Validate session before processing input
      if (!validateCurrentSession()) {
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
      
      // Send input to backend via Socket.IO
      socket.emit('terminal:input', { 
        id: sessionId, 
        data,
        thinkingMode 
      });
      
      // Process any buffered input
      processInputBuffer();
      
      // Track current line buffer for command history
      if (data === '\r') {
        // Enter pressed - command was sent
        if (currentLineBuffer.trim()) {
          const command = currentLineBuffer.trim();
          setCommandHistory(prev => [...prev, command]);
            
          // Memory system: Inject context for Claude commands
          if (memory.isEnabled && memory.isActive && command.toLowerCase().includes('claude')) {
            // Get memory context and inject it
            memory.getInjectionContext().then(memoryContext => {
              if (memoryContext) {
                // Prepend memory context to the command
                const contextPrefix = `\n[Memory Context: ${memoryContext}]\n`;
                // Note: Since we're using PTY, we can't modify the command that was already sent
                // Instead, we'll track it for response handling
                sessionStorage.setItem('last_claude_command', command);
                sessionStorage.setItem('memory_context_injected', 'true');
              }
            });
          }
            
          // Notify parent component about the command
          if (onTerminalCommand) {
            onTerminalCommand(command);
          }
        }
        setCurrentLineBuffer('');
      } else if (data === '\x7F') {
        // Backspace
        setCurrentLineBuffer(prev => prev.slice(0, -1));
      } else if (data >= ' ' || data === '\t') {
        // Regular character
        setCurrentLineBuffer(prev => {
          const newBuffer = prev + data;
          // Check if "claude" has been typed
          if (newBuffer.toLowerCase().includes('claude')) {
            // Activate supervision when claude is typed
            if (!isSupervisionActive) {
              enableSupervision();
              // REMOVED: // REMOVED: console.log('👁️ Supervision auto-activated: claude detected');
            }
            if (onClaudeTyped) {
              onClaudeTyped();
            }
          }
          return newBuffer;
        });
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
    
    xtermRef.current.writeln('\r\n⚡ Spawning AI Team...');
    xtermRef.current.writeln('🤖 Connecting to AI Team Management System...');
    
    try {
      // Call the new Claude Bridge API endpoint
      const response = await fetch('/api/claude-bridge/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement: 'Build a complete project based on user requirements',
          sessionId: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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

  // Handle sandbox creation
  const handleSandboxAction = async () => {
    console.log('🎯 handleSandboxAction called from Terminal');
    
    // Reset previous status
    console.log('🔄 Setting status to: creating');
    setSandboxCreationStatus('creating');
    setSandboxCreationMessage('');
    setCreatedSandboxId('');
    
    // Add console logging for debugging
    console.log('🚀 Creating new sandbox...');
    
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
      console.log('📦 Sandbox API response:', data);
      
      if (data.success) {
        console.log('🔄 Setting status to: success');
        setSandboxCreationStatus('success');
        setSandboxCreationMessage(`✅ Sandbox "${projectName}" created successfully!`);
        setCreatedSandboxId(data.sandbox.id);
        
        // Log success
        console.log('✅ Sandbox created:', data.sandbox);
        
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
          console.log('🔄 Opening sandbox workspace:', data.sandbox.id);
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
          sandboxMode 
            ? 'border-t border-t-orange-500/50 shadow-glow-orange' 
            : 'border-t border-t-coder1-cyan/50 shadow-glow-cyan'
        }`}
        style={{ height: spacing.terminalHeader.height }}
      >
        {/* Left section - Edit mode and settings */}
        <div className="flex items-center gap-2">
          {/* Claude is thinking indicator */}
          {claudeActive && (
            <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-md border border-purple-500/30">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              <span className="text-sm text-purple-300 font-medium">Claude is thinking...</span>
            </div>
          )}
          
          {/* Voice-to-text button */}
          <button
            data-tour="voice-input-button"
            onClick={toggleVoiceRecognition}
            className={`terminal-control-btn p-1.5 rounded-md ${voiceListening ? 'bg-red-600 bg-opacity-20' : ''}`}
            title={voiceListening ? 'Stop voice input (LISTENING)' : 'Start voice-to-text'}
          >
            {voiceListening ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Terminal Settings */}
          <TerminalSettings
            thinkingMode={thinkingMode}
            setThinkingMode={setThinkingMode}
            showThinkingDropdown={showThinkingDropdown}
            setShowThinkingDropdown={setShowThinkingDropdown}
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
        </div>

        {/* Right section - All terminal control buttons */}
        <div className="flex items-center gap-2">
          {/* Stop button */}
          <button
            onClick={() => {
              // Stop all running processes
              setAgentsRunning(false);
              setVoiceListening(false);
              // Supervision is managed by context, not local state
              
              // Stop speech recognition if active
              if (recognition && voiceListening) {
                recognition.stop();
              }
              
              xtermRef.current?.writeln('\r\n🛑 Emergency Stop Activated:');
              xtermRef.current?.writeln('• All AI agents stopped');
              xtermRef.current?.writeln('• Voice input disabled');
              xtermRef.current?.writeln('• Supervision disabled');
              xtermRef.current?.writeln('• Terminal processes killed');
              xtermRef.current?.writeln('\r\nSystem ready for new commands.');
            }}
            className="terminal-stop-btn flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md"
            title="Emergency stop - halt all processes"
          >
            <StopCircle className="w-4 h-4" />
            <span>Stop</span>
          </button>

          {/* AI Team Button */}
          <button
            onClick={handleSpawnAgents}
            className="terminal-control-btn flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md"
            title="Deploy six Claude code agents working in parallel"
          >
            <Users className="w-4 h-4" />
            <span>AI Team</span>
          </button>

          {/* Memory button with dropdown */}
          <div className="relative">
            <button
              data-tour="memory-button"
              onClick={() => setShowMemoryDropdown(!showMemoryDropdown)}
              className="terminal-control-btn flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md"
              title="Memory system status and controls"
            >
              <Brain className="w-4 h-4" />
              <span>Memory</span>
            </button>
            
            {/* Memory dropdown */}
            {showMemoryDropdown && (
              <div 
                ref={memoryDropdownRef}
                className="absolute top-full mt-2 right-0 bg-bg-secondary border border-border-default rounded-lg shadow-lg p-3 z-50 min-w-[250px]"
              >
                <div className="text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className={memory.isActive ? "text-green-400" : "text-yellow-400"}>
                      {memory.isActive ? 'Active' : 'Initializing'}
                    </span>
                  </div>
                  {memory.stats.sessions > 0 && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Sessions:</span>
                        <span className="text-gray-300">{memory.stats.sessions}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Tokens:</span>
                        <span className="text-gray-300">{memory.stats.tokens}</span>
                      </div>
                    </>
                  )}
                  <div className="border-t border-border-default pt-2 mt-2">
                    <button
                      onClick={() => {
                        memory.toggleMemory();
                        setMemoryEnabled(!memoryEnabled);
                      }}
                      className="w-full flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-gradient-to-br from-sky-100/10 to-purple-100/10 border border-cyan-500/50 text-white backdrop-blur-sm transition-all duration-300 hover:border-orange-400/70 hover:bg-gradient-to-br hover:from-orange-100/10 hover:to-amber-100/10 hover:backdrop-blur-md"
                      style={{
                        background: 'linear-gradient(135deg, rgba(125, 211, 252, 0.1) 0%, rgba(187, 154, 247, 0.1) 100%)',
                        border: '1px solid rgba(0, 217, 255, 0.5)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)'
                      }}
                    >
                      {memory.isEnabled ? 'Disable Memory' : 'Enable Memory'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>


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

      {/* Terminal Content - Let xterm.js handle scrolling */}
      <div 
        className="flex-1 relative"
        style={{
          backgroundColor: '#0a0a0a',
          overflow: 'auto',
          paddingBottom: '200px'  // Increased black box space to clear footer/status bar
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
          style={{
            width: '100%',
            minHeight: '100%'
          }}
        />
      </div>

      {/* Error Doctor removed to fix terminal overlap issue */}

      {/* Supervision Configuration Modal */}
      <SupervisionConfigModal 
        isOpen={isConfigModalOpen}
        onClose={() => setConfigModalOpen(false)}
        onSave={saveConfiguration}
        currentConfig={activeConfiguration}
        templates={templates}
      />
      
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
    </div>
  );
}
