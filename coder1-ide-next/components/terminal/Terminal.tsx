'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import './Terminal.css';
import { Users, Zap, StopCircle, Brain, Eye, Code2, Mic, MicOff, Speaker, ChevronDown, Box, X } from '@/lib/icons';
import TerminalSettings, { TerminalSettingsState } from './TerminalSettings';
import { glows, spacing } from '@/lib/design-tokens';
import { getSocket } from '@/lib/socket';
import ErrorDoctor from './ErrorDoctor';
import { soundAlertService, SoundPreset } from '@/lib/sound-alert-service';
import { useEnhancedSupervision } from '@/contexts/EnhancedSupervisionContext';
import SupervisionConfigModal from '@/components/supervision/SupervisionConfigModal';
import { mockEnhancedAgentService, type MockAgentResponse } from '@/services/mock-enhanced-agent-service';
import { pollingManager, usePolling, isPollingDisabled } from '@/lib/polling-control';
import { logger } from '@/lib/logger';

// 🛡️ SAFE FEATURE FLAGS - Enhanced Agent Visualization System
const FEATURE_FLAGS = {
  ENHANCED_AGENTS: typeof window !== 'undefined' && (
    process.env.NODE_ENV === 'development' && 
    localStorage.getItem('coder1-enable-enhanced-agents') === 'true'
  ),
  USE_REAL_AI: typeof window !== 'undefined' && (
    localStorage.getItem('coder1-use-real-ai') === 'true' || 
    process.env.NEXT_PUBLIC_USE_REAL_AI === 'true'
  ),
  // Add more feature flags here as needed
  AGENT_VISUALIZATION: typeof window !== 'undefined' && (
    process.env.NODE_ENV === 'development' && 
    localStorage.getItem('coder1-agent-visualization') === 'true'
  ),
  NATURAL_LANGUAGE_HANDOFFS: typeof window !== 'undefined' && (
    process.env.NODE_ENV === 'development' && 
    localStorage.getItem('coder1-natural-handoffs') === 'true'
  )
};

// Debug helper to enable features (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).enableEnhancedAgents = () => {
    localStorage.setItem('coder1-enable-enhanced-agents', 'true');
    localStorage.setItem('coder1-agent-visualization', 'true');
    localStorage.setItem('coder1-natural-handoffs', 'true');
    logger.debug('🚀 Enhanced Agents enabled! Refresh to activate.');
    logger.debug('To disable: window.disableEnhancedAgents()');
  };
  
  (window as any).disableEnhancedAgents = () => {
    localStorage.removeItem('coder1-enable-enhanced-agents');
    localStorage.removeItem('coder1-agent-visualization');
    localStorage.removeItem('coder1-natural-handoffs');
    logger.debug('🛡️ Enhanced Agents disabled! Refresh to revert to standard mode.');
  };
  
  // Real AI toggle functions
  (window as any).enableRealAI = () => {
    localStorage.setItem('coder1-use-real-ai', 'true');
    localStorage.setItem('coder1-enable-enhanced-agents', 'true');
    localStorage.setItem('coder1-agent-visualization', 'true');
    logger.debug('🤖 Real AI enabled! Using actual AI agents.');
    logger.debug('⚠️  This will use API credits. To disable: window.disableRealAI()');
    window.location.reload();
  };
  
  (window as any).disableRealAI = () => {
    localStorage.removeItem('coder1-use-real-ai');
    logger.debug('🎭 Switched back to mock agents. Refresh to apply.');
  };
}

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface TerminalProps {
  onAgentsSpawn?: () => void;
  onClaudeTyped?: () => void;
  onTerminalData?: (data: string) => void;
  onTerminalCommand?: (command: string) => void;
}

interface BufferState {
  viewportY: number;
  baseY: number;
  cursorX: number;
  cursorY: number;
  totalLines: number;
  hasContent: boolean;
  contentSnapshot: string[];
}

// Buffer preservation utilities for fixing help menu disappearing during resize
const preserveTerminalBuffer = (terminal: XTerm): BufferState | null => {
  try {
    if (!terminal || !terminal.buffer || !terminal.buffer.active) {
      return null;
    }

    const buffer = terminal.buffer.active;
    const contentSnapshot: string[] = [];
    
    // Capture visible content and some buffer around it
    const startLine = Math.max(0, buffer.viewportY - 5);
    const endLine = Math.min(buffer.length, buffer.viewportY + terminal.rows + 5);
    
    for (let i = startLine; i < endLine; i++) {
      const line = buffer.getLine(i);
      if (line) {
        contentSnapshot.push(line.translateToString());
      }
    }
    
    return {
      viewportY: buffer.viewportY,
      baseY: buffer.baseY,
      cursorX: buffer.cursorX,
      cursorY: buffer.cursorY,
      totalLines: buffer.length,
      hasContent: contentSnapshot.some(line => line.trim().length > 0),
      contentSnapshot
    };
  } catch (error) {
    logger.warn('Failed to preserve terminal buffer:', error);
    return null;
  }
};

const needsBufferRestoration = (terminal: XTerm, savedState: BufferState): boolean => {
  try {
    if (!terminal || !terminal.buffer || !terminal.buffer.active || !savedState) {
      return false;
    }

    const buffer = terminal.buffer.active;
    
    // Check if buffer appears to have lost significant content
    const currentLines = buffer.length;
    const lineDifference = Math.abs(currentLines - savedState.totalLines);
    
    // If we've lost more than 3 lines or viewport position changed dramatically, restore
    return lineDifference > 3 || 
           Math.abs(buffer.viewportY - savedState.viewportY) > 10 ||
           (savedState.hasContent && currentLines < 5);
  } catch (error) {
    logger.warn('Failed to check restoration need:', error);
    return false;
  }
};

const restoreTerminalBuffer = (terminal: XTerm, savedState: BufferState): void => {
  try {
    if (!terminal || !savedState || !savedState.hasContent) {
      return;
    }

    // Restore content by writing it back to the terminal
    // This is a simplified restoration - in practice, we just refresh the terminal
    // which should maintain the content if our resize handling is correct
    terminal.refresh(0, terminal.rows - 1);
    
    // Attempt to restore scroll position
    if (savedState.viewportY !== terminal.buffer?.active.viewportY) {
      const scrollDiff = savedState.viewportY - (terminal.buffer?.active.viewportY || 0);
      if (Math.abs(scrollDiff) > 0 && Math.abs(scrollDiff) < 50) {
        terminal.scrollLines(scrollDiff);
      }
    }
    
    logger.debug('🔄 Terminal buffer restoration attempted');
  } catch (error) {
    logger.warn('Failed to restore terminal buffer:', error);
  }
};

// Enhanced DOM readiness guards for xterm.js dimensions error prevention
class DOMReadinessGuard {
  private static instance: DOMReadinessGuard;
  private mutationObserver: MutationObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;

  static getInstance(): DOMReadinessGuard {
    if (!DOMReadinessGuard.instance) {
      DOMReadinessGuard.instance = new DOMReadinessGuard();
    }
    return DOMReadinessGuard.instance;
  }

  /**
   * Validates if a DOM element is truly ready for xterm operations
   */
  validateElementReadiness(element: HTMLElement): boolean {
    if (!element) {
      logger.warn('[DOMGuard] Element is null/undefined');
      return false;
    }

    // Check if element is connected to DOM
    if (!element.isConnected) {
      logger.warn('[DOMGuard] Element not connected to DOM');
      return false;
    }

    // Check if element is visible
    if (element.offsetParent === null && element.style.display !== 'none') {
      logger.warn('[DOMGuard] Element not visible (no offsetParent)');
      return false;
    }

    // Check dimensions
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      logger.warn('[DOMGuard] Element has invalid dimensions:', rect);
      return false;
    }

    // Check if element has layout (computed styles applied)
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
      logger.warn('[DOMGuard] Element hidden by CSS');
      return false;
    }

    logger.debug('[DOMGuard] ✅ Element ready:', {
      width: rect.width,
      height: rect.height,
      connected: element.isConnected,
      display: computedStyle.display
    });
    return true;
  }

  /**
   * Waits for DOM element to be ready with comprehensive checks
   */
  waitForElementReady(element: HTMLElement, maxWaitMs = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let attempts = 0;
      const maxAttempts = Math.floor(maxWaitMs / 100);

      const checkReadiness = () => {
        attempts++;
        const elapsed = Date.now() - startTime;
        
        logger.debug(`[DOMGuard] Checking readiness (attempt ${attempts}/${maxAttempts}, ${elapsed}ms elapsed)`);
        
        if (this.validateElementReadiness(element)) {
          logger.debug(`[DOMGuard] ✅ Element ready after ${elapsed}ms, ${attempts} attempts`);
          resolve(true);
          return;
        }

        if (elapsed >= maxWaitMs || attempts >= maxAttempts) {
          logger.warn(`[DOMGuard] ❌ Timeout waiting for element readiness (${elapsed}ms, ${attempts} attempts)`);
          resolve(false);
          return;
        }

        // Exponential backoff with jitter
        const delay = Math.min(100 + (attempts * 20) + Math.random() * 50, 500);
        setTimeout(checkReadiness, delay);
      };

      checkReadiness();
    });
  }

  /**
   * Safe execution wrapper for xterm.js operations with dimensions error protection
   */
  safeXtermOperation<T>(operation: () => T, operationName: string, defaultValue?: T): T | undefined {
    try {
      logger.debug(`[DOMGuard] Executing safe xterm operation: ${operationName}`);
      const result = operation();
      logger.debug(`[DOMGuard] ✅ Safe operation completed: ${operationName}`);
      return result;
    } catch (error) {
      logger.error(`[DOMGuard] ❌ Safe operation failed: ${operationName}`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('dimensions')) {
          logger.error('[DOMGuard] 🚨 DIMENSIONS ERROR INTERCEPTED:', {
            operationName,
            errorMessage: error.message,
            stack: error.stack?.slice(0, 200)
          });
        }
        
        // Log error patterns for debugging
        const errorPatterns = {
          isUndefinedError: error.message.includes('undefined'),
          isDimensionsError: error.message.includes('dimensions'),
          isNullError: error.message.includes('null'),
          isPropertyError: error.message.includes('property')
        };
        
        logger.error('[DOMGuard] Error analysis:', errorPatterns);
      }
      
      return defaultValue;
    }
  }

  /**
   * Cleanup all observers
   */
  cleanup(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }
}

// Debounce utility for resize operations
const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

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
interface SandboxContext {
  sandboxId: string;
  projectId: string;
  sessionName: string;
  path: string;
}

export default function Terminal({ onAgentsSpawn, onClaudeTyped, onTerminalData, onTerminalCommand }: TerminalProps) {
  logger.debug('🖥️ Terminal component rendering...');
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalMountedRef = useRef(false); // Track if terminal is properly mounted in DOM
  const sessionIdForVoiceRef = useRef<string | null>(null); // Move this up here
  const sessionCreatedRef = useRef(false); // Track if session was already created
  const domGuard = useRef(DOMReadinessGuard.getInstance()); // DOM readiness guard instance
  const [isDOMReady, setIsDOMReady] = useState(false); // Track DOM readiness state
  const [isConnected, setIsConnected] = useState(false);
  const [agentsRunning, setAgentsRunning] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  
  // Sandbox context state
  const [sandboxContext, setSandboxContext] = useState<SandboxContext | null>(null);
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  
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
  
  // Terminal settings state
  const [terminalSettings, setTerminalSettings] = useState<TerminalSettingsState>({
    skipPermissions: false,
    statusLine: {
      enabled: false,
      showFile: true,
      showModel: true,
      showTokens: true
    }
  });

  // Load terminal settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('coder1-terminal-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Validate and ensure statusLine object has all required properties
        const validatedSettings = {
          skipPermissions: parsed.skipPermissions ?? false,
          statusLine: {
            enabled: parsed.statusLine?.enabled ?? false,
            showFile: parsed.statusLine?.showFile ?? true,
            showModel: parsed.statusLine?.showModel ?? true,
            showTokens: parsed.statusLine?.showTokens ?? true
          }
        };
        setTerminalSettings(validatedSettings);
        logger.debug('Loaded terminal settings:', validatedSettings);
      } catch (error) {
        logger.warn('Failed to parse terminal settings:', error);
        // Reset to default if parsing fails
        localStorage.removeItem('coder1-terminal-settings');
      }
    }
  }, []);

  // Save terminal settings to localStorage whenever they change
  useEffect(() => {
    // Skip saving on initial mount
    if (!terminalSettings) return;
    
    try {
      logger.debug('[Terminal] Saving settings to localStorage:', terminalSettings);
      localStorage.setItem('coder1-terminal-settings', JSON.stringify(terminalSettings));
    } catch (error) {
      logger.error('[Terminal] Failed to save settings to localStorage:', error);
    }
  }, [terminalSettings]);
  
  // Listen for storage changes from TerminalSettings component
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'coder1-terminal-settings' && e.newValue) {
        try {
          logger.debug('[Terminal] Detected settings change from TerminalSettings');
          const parsedSettings = JSON.parse(e.newValue);
          
          // Validate and ensure statusLine object has all required properties
          const validatedSettings = {
            skipPermissions: parsedSettings.skipPermissions ?? false,
            statusLine: {
              enabled: parsedSettings.statusLine?.enabled ?? false,
              showFile: parsedSettings.statusLine?.showFile ?? true,
              showModel: parsedSettings.statusLine?.showModel ?? true,
              showTokens: parsedSettings.statusLine?.showTokens ?? true
            }
          };
          
          logger.debug('[Terminal] Updating settings from storage:', validatedSettings);
          setTerminalSettings(validatedSettings);
        } catch (error) {
          logger.error('[Terminal] Failed to parse updated settings from storage:', error);
        }
      }
    };
    
    // Listen for storage events (changes in other tabs/components)
    window.addEventListener('storage', handleStorageChange);
    
    // Custom event for same-tab changes (since storage event doesn't fire for same tab)
    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail?.key === 'coder1-terminal-settings') {
        const newValue = localStorage.getItem('coder1-terminal-settings');
        if (newValue) {
          logger.debug('[Terminal] Detected same-tab settings change');
          handleStorageChange({ key: 'coder1-terminal-settings', newValue } as StorageEvent);
        }
      }
    };
    
    window.addEventListener('terminalSettingsChanged', handleCustomStorageChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('terminalSettingsChanged', handleCustomStorageChange as EventListener);
    };
  }, []);
  
  // ✅ CONTROLLED POLLING: Claude usage (via PollingManager)
  const claudeUsagePolling = usePolling(
    'claude-usage',
    'Claude Usage API',
    async () => {
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
        logger.warn('Claude usage fetch failed:', error);
        throw error; // Let PollingManager handle retry logic
      }
    },
    300000, // 5 minutes (increased from 2 minutes)
    terminalSettings.statusLine?.enabled || false
  );
  
  // Only start polling if explicitly enabled AND not globally disabled
  useEffect(() => {
    if (terminalSettings.statusLine?.enabled && !isPollingDisabled()) {
      logger.debug('🟢 Starting Claude usage polling (controlled)');
      // Don't auto-start - let user manually enable if needed
      // claudeUsagePolling.start();
    } else {
      claudeUsagePolling.stop();
    }
  }, [terminalSettings.statusLine?.enabled, claudeUsagePolling]);
  
  // ✅ CONTROLLED POLLING: MCP status (via PollingManager)
  const mcpStatusPolling = usePolling(
    'mcp-status',
    'MCP Status API',
    async () => {
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
        logger.warn('MCP status fetch failed:', error);
        throw error; // Let PollingManager handle retry logic
      }
    },
    300000, // 5 minutes (increased from 1 minute)
    terminalSettings.statusLine?.enabled || false
  );
  
  // Calculate block reset timer (resets every 3 hours)
  // TEMPORARILY DISABLED - Calculate block reset timer
  useEffect(() => {
    // DISABLED TO PREVENT RUNAWAY TIMERS
    // if (!terminalSettings.statusLine?.enabled) return;
    
    // const updateBlockTimer = () => {
    //   // Get or create the block start time
    //   const blockStartKey = 'claude-block-start-time';
    //   let blockStartTime = localStorage.getItem(blockStartKey);
    //   
    //   if (!blockStartTime) {
    //     // If no start time, set it now
    //     blockStartTime = new Date().toISOString();
    //     localStorage.setItem(blockStartKey, blockStartTime);
    //   }
    //   
    //   const startTime = new Date(blockStartTime);
    //   const now = new Date();
    //   const resetTime = new Date(startTime.getTime() + (3 * 60 * 60 * 1000)); // 3 hours from start
    //   
    //   // Check if we've passed the reset time
    //   if (now >= resetTime) {
    //     // Reset the timer
    //     const newStartTime = new Date().toISOString();
    //     localStorage.setItem(blockStartKey, newStartTime);
    //     setBlockResetTime('3:00:00');
    //   } else {
    //     // Calculate time remaining
    //     const remaining = resetTime.getTime() - now.getTime();
    //     const hours = Math.floor(remaining / (60 * 60 * 1000));
    //     const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    //     const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
    //     
    //     setBlockResetTime(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    //   }
    // };
    
    // // Update immediately and then every second
    // updateBlockTimer();
    // const interval = setInterval(updateBlockTimer, 1000);
    
    // return () => clearInterval(interval);
  }, [terminalSettings.statusLine?.enabled]);

  // NOTE: Terminal settings already saved in useEffect above (lines 295-305)

  // Sandbox connection event listeners
  useEffect(() => {
    const handleSandboxConnect = (event: CustomEvent) => {
      logger.debug('🔌 Terminal received sandbox-connect event:', event.detail);
      const sandboxInfo = event.detail as SandboxContext;
      
      setSandboxContext(sandboxInfo);
      setIsSandboxMode(true);
      
      // Switch to sandbox terminal session
      if (socketRef.current) {
        logger.debug('📡 Switching to sandbox session:', sandboxInfo.sessionName);
        socketRef.current.emit('switch_to_sandbox', {
          sandboxId: sandboxInfo.sandboxId,
          sessionName: sandboxInfo.sessionName
        });
      }
    };

    const handleSandboxDisconnect = (event: CustomEvent) => {
      logger.debug('🔌 Terminal received sandbox-disconnect event:', event.detail);
      const { sandboxId } = event.detail;
      
      // Only disconnect if this is the active sandbox
      if (sandboxContext && sandboxContext.sandboxId === sandboxId) {
        setSandboxContext(null);
        setIsSandboxMode(false);
        
        // Switch back to regular terminal session
        if (socketRef.current) {
          logger.debug('📡 Switching back to regular terminal session');
          socketRef.current.emit('switch_to_main');
        }
      }
    };

    window.addEventListener('sandbox-connect', handleSandboxConnect as EventListener);
    window.addEventListener('sandbox-disconnect', handleSandboxDisconnect as EventListener);
    
    return () => {
      window.removeEventListener('sandbox-connect', handleSandboxConnect as EventListener);
      window.removeEventListener('sandbox-disconnect', handleSandboxDisconnect as EventListener);
    };
  }, [sandboxContext]);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [terminalReady, setTerminalReady] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [errorDoctorActive, setErrorDoctorActive] = useState(true);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const [currentLineBuffer, setCurrentLineBuffer] = useState('');
  const [selectedSoundPreset, setSelectedSoundPreset] = useState<SoundPreset>('gentle');
  const [showSoundPresetDropdown, setShowSoundPresetDropdown] = useState(false);
  const soundButtonRef = useRef<HTMLButtonElement>(null);
  const soundDropdownRef = useRef<HTMLDivElement>(null);
  
  // Scroll tracking - Phase 1: Read-only monitoring
  const [isUserScrolled, setIsUserScrolled] = useState(false);
  const scrollCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Phase 4: Debouncing for flicker reduction
  const scrollDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Create terminal session on mount via REST API
  useEffect(() => {
    // Only create session once per component mount
    if (sessionCreatedRef.current) {
      logger.debug('🛑 Session already created, skipping');
      return;
    }
    
    const createTerminalSession = async () => {
      logger.debug('🚀 CREATING TERMINAL SESSION...');
      
      // Mark as created immediately to prevent duplicates
      sessionCreatedRef.current = true;
      
      try {
        // Generate a unique instance ID for this terminal
        const instanceId = `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create a real terminal session via the backend
        logger.debug('📡 Calling /api/terminal-rest/sessions...');
        const response = await fetch('/api/terminal-rest/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cols: 130,
            rows: 30,
            instanceId: instanceId,
            strictMode: false // Allow session reuse if needed
          }),
        });
        
        logger.debug('📡 Session response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          logger.debug('📡 Session response data:', data);
          
          setSessionId(data.sessionId);
          sessionIdForVoiceRef.current = data.sessionId;
          setTerminalReady(true);
          logger.debug('✅ Terminal session created:', data.sessionId);
        } else {
          const errorData = await response.json().catch(() => ({}));
          logger.error('Failed to create terminal session:', response.status, errorData);
          // Fallback to simulated mode
          const simulatedId = 'simulated-' + Date.now();
          setSessionId(simulatedId);
          sessionIdForVoiceRef.current = simulatedId;
          setTerminalReady(true);
        }
      } catch (error) {
        logger.error('Error creating terminal session:', error);
        // Fallback to simulated mode
        const simulatedId = 'simulated-' + Date.now();
        setSessionId(simulatedId);
        sessionIdForVoiceRef.current = simulatedId;
        setTerminalReady(true);
      }
    };
    
    createTerminalSession();
    
    // Cleanup function
    return () => {
      // Session cleanup will be handled in separate effect
    };
  }, []);

  // 🚀 Enhanced Agent Command Processing
  const processEnhancedCommand = async (command: string) => {
    if (!FEATURE_FLAGS.ENHANCED_AGENTS) return false;
    
    try {
      // Check for natural language handoffs
      if (FEATURE_FLAGS.NATURAL_LANGUAGE_HANDOFFS && 
          (command.toLowerCase().includes('step away') || 
           command.toLowerCase().includes('summarize') ||
           command.toLowerCase().includes('handoff'))) {
        
        // Generate handoff summary (always use mock for now, API route can be added later)
        const summary = mockEnhancedAgentService.generateHandoffSummary({
          terminalHistory: [],  // TODO: Track terminal history
          terminalCommands: [], // TODO: Track terminal commands  
          activeFile: null      // TODO: Track active file
        });
        
        xtermRef.current?.writeln('\r\n🤖 Creating handoff summary...');
        // Simulate processing delay
        setTimeout(() => {
          xtermRef.current?.writeln(summary);
          xtermRef.current?.writeln('\r\n✅ Handoff summary ready!');
        }, 1500);
        
        return true;
      }

      // Check for team deployment confirmation
      if (command.toLowerCase() === 'yes' && FEATURE_FLAGS.AGENT_VISUALIZATION) {
        xtermRef.current?.writeln('\r\n🚀 Deploying AI team...');
        xtermRef.current?.writeln('📡 Assembling agents and coordinating tasks...');
        
        // Trigger team assembly (real or mock based on flag)
        try {
          let team;
          
          if (FEATURE_FLAGS.USE_REAL_AI) {
            try {
              const apiResponse = await fetch('/api/claude/assemble-team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamType: 'fullstack' })
              });
              
              if (apiResponse.ok) {
                team = await apiResponse.json();
              } else {
                throw new Error('Team assembly API failed');
              }
            } catch (error) {
              logger.warn('Real AI team assembly failed, falling back to mock:', error);
              team = await mockEnhancedAgentService.assembleTeam('fullstack');
            }
          } else {
            team = await mockEnhancedAgentService.assembleTeam('fullstack');
          }
          xtermRef.current?.writeln(`✅ Team "${team.teamId}" deployed successfully!`);
          xtermRef.current?.writeln(`👥 ${team.agents.length} agents now coordinating on your request.`);
          xtermRef.current?.writeln(`👀 Watch real-time progress in the preview panel →`);
        } catch (error) {
          xtermRef.current?.writeln('❌ Team deployment failed. Please try again.');
        }
        
        return true;
      }

      // 🛡️ POLLING CONTROL COMMANDS
      if (command.toLowerCase().startsWith('polling ')) {
        const subCommand = command.substring(8).trim().toLowerCase(); // Remove "polling "
        
        if (subCommand === 'status') {
          const status = pollingManager.getStatus();
          xtermRef.current?.writeln('\r\n📊 Polling Control Status:');
          xtermRef.current?.writeln(`🔒 Globally Disabled: ${status.globallyDisabled ? '✅ YES' : '❌ NO'}`);
          xtermRef.current?.writeln(`📈 Total Items: ${status.totalItems}`);
          xtermRef.current?.writeln(`▶️ Active Items: ${status.activeItems}`);
          
          if (status.items.length > 0) {
            xtermRef.current?.writeln('\r\n📋 Registered Polling Items:');
            status.items.forEach(item => {
              const statusIcon = item.isActive ? '▶️' : '⏸️';
              const ageMin = Math.round(item.ageMs / 60000);
              xtermRef.current?.writeln(`  ${statusIcon} ${item.name} (${item.intervalMs}ms, ${item.runCount} runs, ${ageMin}m old)`);
            });
          }
          
          xtermRef.current?.writeln('\r\n💡 Commands: polling kill | polling enable | polling status');
        } 
        else if (subCommand === 'kill') {
          xtermRef.current?.writeln('\r\n🚨 KILLING ALL BACKGROUND POLLING...');
          pollingManager.killAll();
          xtermRef.current?.writeln('☢️ All polling killed. No more runaway API calls!');
          xtermRef.current?.writeln('💡 Use "polling enable" to restore if needed.');
        }
        else if (subCommand === 'enable') {
          xtermRef.current?.writeln('\r\n🔄 Re-enabling polling system...');
          pollingManager.enableAll();
          xtermRef.current?.writeln('✅ Polling system restored.');
          xtermRef.current?.writeln('💡 Individual polling items need to be started manually.');
        }
        else if (subCommand.startsWith('start ')) {
          const itemId = subCommand.substring(6);
          xtermRef.current?.writeln(`\r\n▶️ Starting polling: ${itemId}`);
          // This would need to be implemented based on available items
        }
        else {
          xtermRef.current?.writeln('\r\n🛡️ Polling Control Commands:');
          xtermRef.current?.writeln('  polling status  - Show current polling status');
          xtermRef.current?.writeln('  polling kill    - 🚨 KILL ALL background polling (nuclear option)');
          xtermRef.current?.writeln('  polling enable  - Re-enable polling system');
        }
        
        return true;
      }

      // Check for claude commands that should get enhanced processing
      if (command.toLowerCase().startsWith('claude ')) {
        const userRequest = command.substring(6).trim(); // Remove "claude "
        
        if (userRequest) {
          // Use real AI API route if enabled, otherwise fallback to mock
          let response;
          
          if (FEATURE_FLAGS.USE_REAL_AI) {
            try {
              const apiResponse = await fetch('/api/claude/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: userRequest })
              });
              
              if (apiResponse.ok) {
                response = await apiResponse.json();
              } else {
                throw new Error('API call failed');
              }
            } catch (error) {
              logger.warn('Real AI API failed, falling back to mock:', error);
              response = mockEnhancedAgentService.analyzeUserInput(userRequest);
            }
          } else {
            response = mockEnhancedAgentService.analyzeUserInput(userRequest);
          }
          
          // Show memory insights first
          if (response.memoryInsights.length > 0) {
            xtermRef.current?.writeln('\r\n💡 Context from your development patterns:');
            response.memoryInsights.forEach((insight: any) => {
              const icon = insight.type === 'pattern' ? '🔄' : 
                          insight.type === 'success' ? '✅' : 
                          insight.type === 'warning' ? '⚠️' : '💡';
              xtermRef.current?.writeln(`   ${icon} ${insight.content}`);
            });
            xtermRef.current?.writeln('');
          }

          // Handle team suggestions
          if (response.isTeamSuggestion && response.teamSuggestion) {
            const suggestion = response.teamSuggestion;
            
            xtermRef.current?.writeln(`\r\n${response.response}`);
            xtermRef.current?.writeln(`\r\n🎯 Recommended: ${suggestion.recommendedTeam.name}`);
            xtermRef.current?.writeln(`👥 Team: ${suggestion.recommendedTeam.agents.join(', ')}`);
            xtermRef.current?.writeln(`📊 Confidence: ${Math.round(suggestion.confidence * 100)}%`);
            xtermRef.current?.writeln(`\r\n✨ Benefits:`);
            
            suggestion.benefits.forEach((benefit: string) => {
              xtermRef.current?.writeln(`   • ${benefit}`);
            });
            
            xtermRef.current?.writeln(`\r\n💬 Type "yes" to deploy this team, or describe what you want differently.`);
            
            if (FEATURE_FLAGS.AGENT_VISUALIZATION) {
              xtermRef.current?.writeln(`👀 WATCH AGENTS ASSEMBLE IN PREVIEW PANEL →`);
              
              // Dispatch assembly event to preview panel
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('agent-team-assembly', {
                  detail: { teamSuggestion: suggestion }
                }));
              }
            }
          } else {
            // Simple single agent response
            xtermRef.current?.writeln(`\r\n🤖 ${response.response}`);
          }
          
          return true;
        }
      }

      // Check for quick action commands
      const quickActions = {
        'code-review': 'Running code review on current file...',
        'find-bugs': 'Scanning for potential bugs and issues...',
        'security-audit': 'Performing security analysis...',
        'optimize-performance': 'Analyzing performance bottlenecks...',
        'generate-tests': 'Generating test cases...',
        'improve-ui': 'Analyzing UI/UX improvements...'
      };

      const actionKey = Object.keys(quickActions).find(action => 
        command.toLowerCase().includes(action.replace('-', ' ')) ||
        command.toLowerCase().includes(action)
      );

      if (actionKey) {
        xtermRef.current?.writeln(`\r\n⚡ ${quickActions[actionKey as keyof typeof quickActions]}`);
        
        // Simulate processing with progress
        let progress = 0;
        const interval = setInterval(() => {
          progress += 20;
          const bar = '█'.repeat(progress / 5) + '░'.repeat(20 - progress / 5);
          xtermRef.current?.write(`\r🔄 Progress: [${bar}] ${progress}%`);
          
          if (progress >= 100) {
            clearInterval(interval);
            xtermRef.current?.writeln(`\r\n✅ ${actionKey} completed! Results ready for review.`);
          }
        }, 800);
        
        return true;
      }

    } catch (error) {
      logger.error('Enhanced command processing failed:', error);
      xtermRef.current?.writeln('\r\n⚠️ Enhanced processing failed, using standard mode...');
    }
    
    return false;
  };
  
  // Store whether component is mounted
  const isMountedRef = useRef(true);
  
  // Cleanup session only on actual unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      
      // Clean up socket listeners to prevent memory leaks
      if (socketRef.current) {
        logger.debug('🧹 Cleaning up socket listeners');
        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
        socketRef.current.off('connect_error');
        socketRef.current.off('terminal:data');
        socketRef.current.off('terminal:created');
        socketRef.current.off('terminal:error');
        socketRef.current.off('claude:output');
        socketRef.current.off('claude:sessionComplete');
        socketRef.current.off('claude:error');
        socketRef.current.off('sandbox:switched');
        socketRef.current.off('sandbox:main_switched');
        socketRef.current.off('sandbox:switch_error');
        
        // Leave the terminal session
        const currentSessionId = sessionIdForVoiceRef.current || sessionId;
        if (currentSessionId) {
          socketRef.current.emit('terminal:leave', { id: currentSessionId });
        }
      }
      
      // Clean up terminal instance
      if (xtermRef.current) {
        logger.debug('🧹 Disposing terminal instance');
        try {
          xtermRef.current.dispose();
        } catch (e) {
          logger.error('Error disposing terminal:', e);
        }
        xtermRef.current = null;
      }
      
      // Clean up fit addon
      if (fitAddonRef.current) {
        fitAddonRef.current = null;
      }
      
      // Reset mounted flag
      terminalMountedRef.current = false;
      
      // Only cleanup the current session on unmount
      const currentSessionId = sessionIdForVoiceRef.current || sessionId;
      if (currentSessionId && !currentSessionId.startsWith('simulated-')) {
        logger.debug('🧹 Cleaning up terminal session on unmount:', currentSessionId);
        fetch(`/api/terminal-rest/sessions/${currentSessionId}`, {
          method: 'DELETE'
        }).catch(err => {
          logger.debug('Session cleanup (expected on unmount):', err.message);
        });
      }
      
      // Clear global session markers on unmount
      localStorage.removeItem('coder1-active-terminal-session');
      sessionStorage.removeItem('coder1-terminal-session-creating');
      logger.debug('🧹 Cleared global session markers');
    };
  }, []); // Empty dependency array - only run on mount/unmount

  useEffect(() => {
    logger.debug('🖥️ INITIALIZING XTERM...');
    if (!terminalRef.current) {
      logger.debug('❌ Terminal ref not ready');
      return;
    }

    try {
      logger.debug('🔧 Creating XTerm instance...');
      // Initialize terminal with exact settings
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
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      
      // Always open terminal regardless of visibility - fixes "only loads after resize" issue
      if (terminalRef.current) {
        term.open(terminalRef.current);
        
        // Set mounted flag after successful opening
        terminalMountedRef.current = true;
        
        // Store references immediately for resize attempts
        xtermRef.current = term;
        fitAddonRef.current = fitAddon;
        
        // Force initial resize with retry logic to fix "Phase 1 of 4" stuck issue
        let resizeAttempts = 0;
        const maxAttempts = 5;
        
        const attemptResize = async () => {
          resizeAttempts++;
          try {
            if (!terminalRef.current || !fitAddon) {
              logger.debug(`[Terminal] Resize attempt ${resizeAttempts}/${maxAttempts} - Container not ready`);
              if (resizeAttempts < maxAttempts) {
                setTimeout(attemptResize, 200 * resizeAttempts); // Exponential backoff
              }
              return;
            }
            
            logger.debug(`[Terminal] Resize attempt ${resizeAttempts}/${maxAttempts} - Checking DOM readiness`);
            
            // PHASE 1: DOM READINESS GUARDS - Use comprehensive DOM validation
            const isReady = await domGuard.current.waitForElementReady(terminalRef.current, 2000);
            if (!isReady) {
              logger.debug(`[Terminal] Resize attempt ${resizeAttempts}/${maxAttempts} - DOM not ready after timeout`);
              if (resizeAttempts < maxAttempts) {
                setTimeout(attemptResize, 300 * resizeAttempts);
              }
              return;
            }
            
            logger.debug(`[Terminal] Resize attempt ${resizeAttempts}/${maxAttempts} - DOM ready, fitting terminal`);
            
            // Enhanced safety checks with DOM validation
            try {
              if (terminalMountedRef.current && fitAddon && term && term.element && 
                  terminalRef.current?.contains(term.element) &&
                  domGuard.current.validateElementReadiness(terminalRef.current)) {
                
                // Additional xterm.js state validation before fit
                if (term.cols === 0 || term.rows === 0) {
                  logger.warn('[Terminal] Xterm not properly initialized (0 cols/rows), waiting...');
                  if (resizeAttempts < maxAttempts) {
                    setTimeout(attemptResize, 300 * resizeAttempts);
                  }
                  return;
                }
                
                logger.debug(`[Terminal] Fitting terminal with DOM validation passed`);
                // PHASE 3: ERROR BOUNDARY PROTECTION - Wrap fit operation
                domGuard.current.safeXtermOperation(
                  () => {
                    fitAddon.fit();
                    term.focus();
                    return { cols: term.cols, rows: term.rows };
                  },
                  'fitAddon.fit() during attemptResize'
                );
              } else {
                logger.warn('[Terminal] Cannot fit - terminal not properly mounted or DOM not ready');
                return;
              }
            } catch (fitError) {
              logger.error('[Terminal] Fit error with enhanced guards:', fitError);
              if (fitError instanceof Error && fitError.message.includes('dimensions')) {
                logger.error('[Terminal] 🚨 DIMENSIONS ERROR CAUGHT - implementing additional safeguards');
                // Additional wait before retry on dimensions error
                if (resizeAttempts < maxAttempts) {
                  setTimeout(attemptResize, 500 * resizeAttempts);
                }
              }
              return;
            }
            
            // Verify the fit worked with enhanced validation
            const { cols, rows } = term;
            if (cols > 0 && rows > 0) {
              logger.debug(`[Terminal] ✅ Successfully fitted with DOM guards: ${cols}x${rows}`);
              
              // Set DOM ready state
              setIsDOMReady(true);
              
              // Add custom welcome message only after successful fit
              if (resizeAttempts === 1) { // Only show once on first success
                term.clear();
                term.writeln('Coder1 Terminal Ready');
                term.writeln("Type 'claude' to start AI-assisted coding");
                term.writeln('──────────────────────────────────────────────');
                term.writeln('');
              }
              
              // Mark terminal as ready - connection handled by separate useEffect
              setTerminalReady(true);
              
              // Trigger a manual resize event to ensure backend is notified
              if (socketRef.current?.connected && sessionId) {
                socketRef.current.emit('terminal:resize', { id: sessionId, cols, rows });
              }
            } else if (resizeAttempts < maxAttempts) {
              logger.debug(`[Terminal] Invalid dimensions after fit, retrying with extended delay...`);
              setTimeout(attemptResize, 300 * resizeAttempts);
            }
          } catch (error) {
            logger.debug(`[Terminal] Resize attempt ${resizeAttempts}/${maxAttempts} error:`, error);
            if (resizeAttempts < maxAttempts) {
              setTimeout(attemptResize, 200 * resizeAttempts);
            }
          }
        };
        
        // Start resize attempts immediately
        attemptResize();

        // ROBUST SCROLL SYSTEM: Handle both tracking AND auto-scrolling
        // This replaces the competing WebSocket scroll logic
        const checkScrollPosition = () => {
          if (term && term.buffer && term.buffer.active) {
            try {
              const buffer = term.buffer.active;
              const isAtBottom = buffer.viewportY === buffer.baseY;
              const hasNewContent = buffer.baseY > 0; // Check if there's actually content
              
              // 🔍 DIAGNOSTIC: Log scroll state changes for investigation
              const timestamp = Date.now();
              const debugInfo = {
                timestamp,
                isAtBottom,
                hasNewContent,
                viewportY: buffer.viewportY,
                baseY: buffer.baseY,
                isUserScrolled,
                sessionId
              };
              
              // Log significant state changes
              if (isAtBottom !== (buffer.viewportY === buffer.baseY)) {
                logger.debug('🔍 SCROLL STATE CHANGE:', debugInfo);
              }
              
              // Clear existing debounce timer
              if (scrollDebounceRef.current) {
                clearTimeout(scrollDebounceRef.current);
              }
              
              // Debounce the state update by 50ms (reduced for more responsiveness)
              scrollDebounceRef.current = setTimeout(() => {
                if (!isAtBottom && !isUserScrolled) {
                  logger.debug('👆 USER SCROLLED UP:', debugInfo);
                  setIsUserScrolled(true);
                } else if (isAtBottom && isUserScrolled) {
                  logger.debug('👇 USER RETURNED TO BOTTOM:', debugInfo);
                  setIsUserScrolled(false);
                }
                
                // AUTO-SCROLL LOGIC: If user is at bottom and there's new content, keep following
                if (isAtBottom && hasNewContent && !isUserScrolled) {
                  logger.debug('🚀 AUTO-SCROLL TRIGGERED:', debugInfo);
                  // Use multiple scroll methods to ensure it works
                  try {
                    term.scrollToBottom();
                    // Fallback: Force viewport to match baseY if scrollToBottom fails
                    if (term.buffer && term.buffer.active && buffer.viewportY !== buffer.baseY) {
                      logger.debug('🔧 FORCING VIEWPORT SYNC:', { from: buffer.viewportY, to: buffer.baseY });
                      term.scrollLines(buffer.baseY - buffer.viewportY);
                    }
                  } catch (scrollError) {
                    logger.error('❌ SCROLL ERROR:', scrollError);
                  }
                }
              }, 50);
            } catch (e) {
              logger.error('❌ SCROLL CHECK ERROR:', e);
            }
          }
        };
        
        // 🔍 DIAGNOSTIC: Log timer setup
        logger.debug('⏰ SETTING UP SCROLL INTERVAL - TEMPORARILY DISABLED');
        // TEMPORARILY DISABLED TO PREVENT RUNAWAY INTERVALS
        // scrollCheckIntervalRef.current = setInterval(checkScrollPosition, 150); // Increased frequency for better responsiveness

        // 🔧 ENHANCED RESIZE OBSERVER WITH DOM GUARDS AND BUFFER PRESERVATION
        // This fixes the help menu disappearing issue by preserving terminal content during resize
        const debouncedResize = debounce((term: XTerm, socket: any) => {
          try {
            if (!fitAddonRef.current || !term || !terminalRef.current) {
              logger.warn('[Terminal] Resize skipped - missing dependencies');
              return;
            }

            logger.debug('📐 Enhanced ResizeObserver: Starting resize with DOM guards and buffer preservation');
            
            // PHASE 1: DOM READINESS VALIDATION before any xterm operations
            const isReady = domGuard.current.validateElementReadiness(terminalRef.current);
            if (!isReady) {
              logger.warn('[Terminal] Resize skipped - DOM not ready');
              return;
            }
            
            // Step 1: Preserve current buffer state
            const bufferState = preserveTerminalBuffer(term);
            
            // Step 2: Perform the resize operation with enhanced safety
            try {
              if (terminalMountedRef.current && fitAddonRef.current && term && term.element &&
                  domGuard.current.validateElementReadiness(terminalRef.current)) {
                
                // Additional xterm state validation before fit
                if (!term.buffer || !term.buffer.active) {
                  logger.warn('[Terminal] Xterm buffer not ready during resize');
                  return;
                }
                
                logger.debug('[Terminal] Performing fit with DOM validation');
                // PHASE 3: ERROR BOUNDARY PROTECTION - Wrap resize fit operation
                domGuard.current.safeXtermOperation(
                  () => {
                    fitAddonRef.current!.fit();
                    return { cols: term.cols, rows: term.rows };
                  },
                  'fitAddon.fit() during resize'
                );
              } else {
                logger.warn('[Terminal] Cannot fit during resize - terminal or DOM not ready');
                return;
              }
            } catch (fitError) {
              logger.error('[Terminal] Fit error during resize with enhanced guards:', fitError);
              if (fitError instanceof Error && fitError.message.includes('dimensions')) {
                logger.error('[Terminal] 🚨 DIMENSIONS ERROR during resize - terminal may be in invalid state');
              }
              return;
            }
            
            // Step 3: Send resize notification to backend
            if (socket && socket.connected && sessionId) {
              const { cols, rows } = term;
              socket.emit('terminal:resize', { id: sessionId, cols, rows });
              logger.debug('📡 Notified backend of resize:', { cols, rows });
            }
            
            // Step 4: Refresh the terminal display
            if (term.rows) {
              term.refresh(0, term.rows - 1);
            }
            
            // Step 5: Check if restoration is needed and restore if necessary
            setTimeout(() => {
              if (bufferState && needsBufferRestoration(term, bufferState)) {
                logger.debug('🔄 Restoring terminal buffer after resize');
                restoreTerminalBuffer(term, bufferState);
              } else {
                logger.debug('✅ Terminal content preserved during resize');
              }
            }, 100); // Allow resize to complete before checking
            
          } catch (error) {
            logger.warn('Enhanced ResizeObserver callback error:', error);
          }
        }, 150); // Debounce resize calls by 150ms

        // Set up enhanced resize observer with DOM guards
        const resizeObserver = new ResizeObserver((entries) => {
          if (term && socketRef.current && isDOMReady) {
            // Additional validation before triggering resize
            if (terminalRef.current && domGuard.current.validateElementReadiness(terminalRef.current)) {
              debouncedResize(term, socketRef.current);
            } else {
              logger.warn('[Terminal] Resize observer - DOM validation failed');
            }
          }
        });

        if (terminalRef.current) {
          resizeObserver.observe(terminalRef.current);
          if (terminalRef.current.parentElement) {
            resizeObserver.observe(terminalRef.current.parentElement);
          }
        }

        // Return cleanup function with DOM guard cleanup
        const cleanup = () => {
          try {
            logger.debug('🧹 CLEANING UP TERMINAL WITH DOM GUARDS:', { sessionId });
            
            // Clean up resize observer
            resizeObserver.disconnect();
            
            // Clean up DOM observers
            domGuard.current.cleanup();
            
            // Clean up scroll monitoring
            if (scrollCheckIntervalRef.current) {
              logger.debug('⏰ CLEARING SCROLL INTERVAL');
              clearInterval(scrollCheckIntervalRef.current);
              scrollCheckIntervalRef.current = null;
            }
            // Phase 4: Clean up debounce timer
            if (scrollDebounceRef.current) {
              logger.debug('⏰ CLEARING DEBOUNCE TIMER');
              clearTimeout(scrollDebounceRef.current);
              scrollDebounceRef.current = null;
            }
            if (term) {
              logger.debug('🗑️ DISPOSING TERMINAL WITH ENHANCED CLEANUP');
              // Additional safety checks before disposal
              try {
                if (term.element && term.element.parentNode) {
                  term.dispose();
                } else {
                  logger.debug('Terminal already detached, skipping dispose');
                }
              } catch (disposeError) {
                logger.warn('Terminal dispose error (expected if already disposed):', disposeError);
              }
            }
            
            // Reset DOM ready state
            setIsDOMReady(false);
          } catch (error) {
            logger.error('❌ ENHANCED CLEANUP ERROR:', error);
          }
        };

        return cleanup;
        
      } else {
        logger.debug('Terminal container not ready, starting retry logic...');
        // Store references for retry attempts
        xtermRef.current = term;
        fitAddonRef.current = fitAddon;
        
        // Retry with exponential backoff
        let retryCount = 0;
        const maxRetries = 10;
        
        const retryInit = async () => {
          retryCount++;
          logger.debug(`[Terminal] Retry attempt ${retryCount}/${maxRetries}`);
          
          // Enhanced retry logic with DOM guards
          if (terminalRef.current) {
            const isElementReady = await domGuard.current.waitForElementReady(terminalRef.current, 1000);
            
            if (isElementReady) {
              // Only open terminal if not already opened
              if (!term.element) {
                logger.debug('[Terminal] Container now ready with DOM validation, opening terminal...');
                term.open(terminalRef.current);
                terminalMountedRef.current = true;
              } else {
                logger.debug('[Terminal] Terminal already opened, just fitting...');
              }
              
              // Enhanced fitting with DOM validation
              logger.debug('[Terminal] Fitting with DOM readiness validation');
              
              // Add delay and comprehensive validation before fitting
              setTimeout(() => {
                try {
                  const stillReady = domGuard.current.validateElementReadiness(terminalRef.current!);
                  
                  if (terminalMountedRef.current && fitAddon && term && term.element && 
                      terminalRef.current?.contains(term.element) && stillReady) {
                    
                    // Additional xterm state validation
                    if (!term.buffer || !term.buffer.active) {
                      logger.warn('[Terminal] Xterm buffer not ready during init, waiting...');
                      if (retryCount < maxRetries) {
                        const delay = Math.min(100 * Math.pow(1.5, retryCount), 2000);
                        setTimeout(retryInit, delay);
                      }
                      return;
                    }
                    
                    // PHASE 3: ERROR BOUNDARY PROTECTION - Wrap retry fit operation
                    domGuard.current.safeXtermOperation(
                      () => {
                        fitAddon.fit();
                        term.focus();
                        return { cols: term.cols, rows: term.rows };
                      },
                      'fitAddon.fit() during retryInit'
                    );
                  } else {
                    logger.warn('[Terminal] Cannot fit - terminal or DOM not ready during initialization');
                  }
                } catch (fitError) {
                  logger.error('[Terminal] Fit error during initialization with guards:', fitError);
                  if (fitError instanceof Error && fitError.message.includes('dimensions')) {
                    logger.error('[Terminal] 🚨 DIMENSIONS ERROR during init - retrying with longer delay');
                    if (retryCount < maxRetries) {
                      const delay = Math.min(200 * Math.pow(1.5, retryCount), 3000);
                      setTimeout(retryInit, delay);
                    }
                  }
                }
              }, 100); // Increased delay for DOM stability
              
              // Verify the fit worked with DOM validation
              setTimeout(() => {
                const { cols, rows } = term;
                if (cols > 0 && rows > 0) {
                  logger.debug(`[Terminal] ✅ Successfully fitted on retry with DOM guards: ${cols}x${rows}`);
                  setIsDOMReady(true);
                  term.clear();
                  term.writeln('Coder1 Terminal Ready');
                  term.writeln("Type 'claude' to start AI-assisted coding");
                  term.writeln('──────────────────────────────────────────────');
                  term.writeln('');
                  return; // Success!
                }
              }, 50);
            }
          }
          
          // Retry if not successful
          if (retryCount < maxRetries) {
            const delay = Math.min(100 * Math.pow(1.5, retryCount), 2000);
            logger.debug(`[Terminal] Will retry in ${delay}ms...`);
            setTimeout(retryInit, delay);
          } else {
            logger.error('[Terminal] Failed to initialize after maximum retries');
          }
        };
        
        // Start retry process
        setTimeout(retryInit, 100);
      }
    } catch (error) {
      logger.error('Terminal initialization error:', error);
      // Set up a basic fallback
      if (terminalRef.current) {
        terminalRef.current.innerHTML = '<div style="color: #ff6b6b; padding: 20px;">Terminal initialization failed. Please refresh the page.</div>';
      }
    }
  }, []);

  // Force fit when terminal becomes ready
  useEffect(() => {
    if (terminalReady && fitAddonRef.current && xtermRef.current) {
      logger.debug('[Terminal] Terminal ready, forcing fit...');
      setTimeout(() => {
        if (fitAddonRef.current && terminalRef.current) {
          const rect = terminalRef.current.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            logger.debug(`[Terminal] Forcing fit with dimensions: ${rect.width}x${rect.height}`);
            // PHASE 3: ERROR BOUNDARY PROTECTION - Wrap forced fit operation
            if (terminalMountedRef.current && fitAddonRef.current && xtermRef.current && xtermRef.current.element) {
              const result = domGuard.current.safeXtermOperation(
                () => {
                  fitAddonRef.current!.fit();
                  xtermRef.current!.focus();
                  const { cols, rows } = xtermRef.current!;
                  logger.debug(`[Terminal] After forced fit: ${cols}x${rows}`);
                  return { cols, rows };
                },
                'fitAddon.fit() during forced resize'
              );
              if (!result) {
                logger.warn('[Terminal] Forced fit operation failed with error boundary protection');
              }
            } else {
              logger.warn('[Terminal] Cannot fit during forced resize - terminal not ready');
            }
          }
        }
      }, 100);
    }
  }, [terminalReady]);

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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showThinkingDropdown, showSoundPresetDropdown]);

  // Load sound preferences
  useEffect(() => {
    setAudioAlertsEnabled(soundAlertService.getEnabled());
    setSelectedSoundPreset(soundAlertService.getPreset());
  }, []);

  // Keep sessionId ref in sync for voice callbacks
  useEffect(() => {
    sessionIdForVoiceRef.current = sessionId;
    logger.debug('📝 Updated sessionIdForVoiceRef:', sessionId);
  }, [sessionId]);

  // Store isConnected in a ref for use in callbacks
  const isConnectedRef = useRef(false);
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false; // Changed to false for better control
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      recognitionInstance.maxAlternatives = 1;
      
      recognitionInstance.onresult = (event: any) => {
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
        
        // Show interim results as user speaks (removed for clean output)
        if (interimTranscript && xtermRef.current) {
          logger.debug('Interim transcript:', interimTranscript);
          // Interim feedback removed for clean experience
        }
        
        if (finalTranscript && finalTranscript.trim()) {
          // Clean up the transcript
          const cleanTranscript = finalTranscript.trim();
          logger.debug('Final speech recognized:', cleanTranscript);
          
          // Clear interim feedback and show final (prefix removed for clean output)
          if (xtermRef.current) {
            
            // Check if it's a Claude activation command (message removed for clean output)
            if (cleanTranscript.toLowerCase().includes('claude')) {
              setClaudeActive(true);
              setConversationMode(true);
              
              // Activate supervision
              if (!isSupervisionActive) {
                enableSupervision();
              }
            }
            
            // Write the text to the terminal UI for immediate feedback
            xtermRef.current.write(cleanTranscript);
            
            // Get the socket from the global socket service
            const socket = getSocket();
            const currentSessionId = sessionIdForVoiceRef.current;
            
            logger.debug('🎤 Voice input debug:', {
              sessionIdFromRef: currentSessionId,
              sessionIdFromState: sessionId,
              socketConnected: socket?.connected,
              transcript: cleanTranscript
            });
            
            // Send to backend if we have a valid session
            if (socket && socket.connected && currentSessionId && !currentSessionId.startsWith('simulated-')) {
              logger.debug('✅ Sending voice input to real session:', currentSessionId);
              
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
              logger.warn('Cannot send voice input to backend:', {
                socketConnected: socket?.connected,
                sessionId: currentSessionId
              });
              
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
        logger.error('Speech recognition error:', event.error);
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
            logger.debug('Auto-restart failed:', error);
            setVoiceListening(false);
          }
        } else {
          setVoiceListening(false);
        }
      };
      
      setRecognition(recognitionInstance);
      
      // Cleanup function to prevent memory leaks
      return () => {
        if (recognitionInstance) {
          try {
            recognitionInstance.stop();
          } catch (e) {
            // Ignore errors when stopping
          }
          recognitionInstance.onresult = null;
          recognitionInstance.onerror = null;
          recognitionInstance.onend = null;
          recognitionInstance.onstart = null;
        }
      };
    } else {
      logger.warn('Speech recognition not supported in this browser');
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
    } else {
      try {
        
        // Create a timeout promise for getUserMedia
        const requestMicrophonePermission = async (): Promise<MediaStream> => {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('MediaDevices API not supported');
          }
          
          return Promise.race<MediaStream>([
            navigator.mediaDevices.getUserMedia({ audio: true }),
            new Promise<MediaStream>((_, reject) => 
              setTimeout(() => reject(new Error('Permission request timeout')), 5000)
            )
          ]);
        };

        let permissionGranted = false;
        
        try {
          const stream = await requestMicrophonePermission();
          // Clean up the stream immediately - we only needed permission
          stream.getTracks().forEach(track => track.stop());
          permissionGranted = true;
        } catch (permError: any) {
          logger.debug('Microphone permission error:', permError);
          
          if (permError?.name === 'NotFoundError') {
            xtermRef.current?.writeln('❌ No microphone found');
            return;
          }
          // Other permission errors - continue silently
        }
        
        // HTTPS check removed for clean output
        
        // Try to start speech recognition regardless of permission check result
        // The speech recognition API will handle its own permission requests
        
        recognition.start();
        setVoiceListening(true);
        
      } catch (error: any) {
        logger.error('Failed to start speech recognition:', error);
        setVoiceListening(false);
        xtermRef.current?.writeln('\r\n❌ Failed to start voice input');
        
        if (error?.name === 'NotAllowedError') {
          xtermRef.current?.writeln('Permission denied. Please:');
          xtermRef.current?.writeln('1. Click the microphone icon in your browser\'s address bar');
          xtermRef.current?.writeln('2. Select "Allow" for microphone access');
          xtermRef.current?.writeln('3. Try the voice button again');
        } else if (error?.name === 'ServiceNotAllowedError') {
          xtermRef.current?.writeln('Speech service not allowed. This may require HTTPS.');
        } else {
          xtermRef.current?.writeln(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          xtermRef.current?.writeln('💡 Try refreshing the page and clicking the microphone button again');
        }
      }
    }
  };

  const connectToBackend = useCallback((term: XTerm) => {
    logger.debug('🔌 CONNECTING TO BACKEND:', { sessionId, terminalReady });
    if (!sessionId || !terminalReady) {
      logger.debug('❌ Session not ready yet:', { sessionId, terminalReady });
      return;
    }

    // Get Socket.IO instance to connect to Express backend
    logger.debug('🔧 Getting Socket.IO instance...');
    const socket = getSocket();
    logger.debug('✅ Socket.IO instance obtained:', socket.connected ? 'CONNECTED' : 'DISCONNECTED');
    socketRef.current = socket;
    
    // Track connection state for retry logic
    let connectionRetries = 0;
    const maxRetries = 3;
    
    const attemptConnection = () => {
      connectionRetries++;
      logger.debug(`[Terminal] WebSocket connection attempt ${connectionRetries}/${maxRetries}`);
      
      // Join the terminal session
      logger.debug('📡 Emitting terminal:create for session:', sessionId);
      socket.emit('terminal:create', { id: sessionId });
      
      // Set timeout to verify connection
      setTimeout(() => {
        if (!socket.connected && connectionRetries < maxRetries) {
          logger.debug(`[Terminal] WebSocket not connected, retrying...`);
          attemptConnection();
        } else if (!socket.connected) {
          logger.error('[Terminal] Failed to establish WebSocket connection after max retries');
          term.writeln('\r\n⚠️ Terminal connection failed. Please refresh the page.');
        }
      }, 2000);
    };

    // Add connection status listeners for debugging
    socket.on('connect', () => {
      logger.debug('🟢 Socket.IO CONNECTED to backend');
      setIsConnected(true);
      connectionRetries = 0; // Reset on successful connection
      
      // Re-join session on reconnect if needed
      if (sessionId) {
        logger.debug('📡 Re-joining session after connect:', sessionId);
        socket.emit('terminal:create', { id: sessionId });
      }
    });
    
    socket.on('disconnect', (reason) => {
      logger.debug('🔴 Socket.IO DISCONNECTED:', reason);
      setIsConnected(false);
      
      // Notify user of disconnection
      if (term) {
        term.writeln('\r\n⚠️ Terminal disconnected. Attempting to reconnect...');
      }
    });
    
    socket.on('connect_error', (error) => {
      logger.error('❌ Socket.IO CONNECTION ERROR:', error);
      
      // Show error to user on first connection failure
      if (connectionRetries === 1 && term) {
        term.writeln('\r\n⚠️ Connection error. Retrying...');
      }
    });
    
    // Start connection attempt
    if (socket.connected) {
      logger.debug('📡 Socket already connected, joining session immediately with ID:', sessionId);
      socket.emit('terminal:create', { id: sessionId });
      setIsConnected(true);
    } else {
      logger.debug('📡 Socket not connected, attempting connection...');
      attemptConnection();
    }

    // Handle terminal output from backend
    socket.on('terminal:data', ({ id, data }: { id: string; data: string }) => {
      if (id === sessionId && term) {
        // 🔍 DIAGNOSTIC: Log incoming terminal data
        const timestamp = Date.now();
        const dataLength = data.length;
        const hasNewlines = data.includes('\n');
        const hasCarriageReturn = data.includes('\r');
        
        logger.debug('📡 WEBSOCKET DATA:', {
          timestamp,
          sessionId: id,
          dataLength,
          hasNewlines,
          hasCarriageReturn,
          preview: data.length > 50 ? data.substring(0, 50) + '...' : data
        });
        
        // CRITICAL FIX: Remove ALL automatic scrolling from WebSocket handler
        // Let the user-controlled scroll monitoring handle all scroll behavior
        
        // Write the data (this is all we should do here)
        term.write(data);
        
        // Check if we should display statusline after command completion
        if (terminalSettings.statusLine?.enabled && data.includes('\n')) {
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
          logger.debug('🤖 CLAUDE ACTIVATED');
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
          logger.debug('❌ ERROR DETECTED:', data.substring(0, 100));
          setLastError(data);
        }
      }
    });

    // Handle terminal creation confirmation
    socket.on('terminal:created', ({ id }: { id: string }) => {
      if (id === sessionId) {
        logger.debug('✅ Terminal connected to Express backend');
        setIsConnected(true);
        
        // Send initial resize
        if (fitAddonRef.current && xtermRef.current) {
          const { cols, rows } = xtermRef.current;
          socket.emit('terminal:resize', { id: sessionId, cols, rows });
        }
      }
    });

    // Handle errors
    socket.on('terminal:error', ({ message }: { message: string }) => {
      logger.error('Terminal error:', message);
      term.writeln(`\r\n❌ Terminal error: ${message}`);
      setIsConnected(false);
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

    // Handle sandbox switching responses
    socket.on('sandbox:switched', ({ sandboxId, sessionName, path, message }: { 
      sandboxId: string; 
      sessionName: string; 
      path: string; 
      message: string; 
    }) => {
      if (term) {
        term.writeln(`\r\n✅ ${message}`);
        term.writeln(`📁 Working in: ${path}\r\n`);
      }
      logger.debug(`[Terminal] Successfully connected to sandbox ${sandboxId}`);
    });

    socket.on('sandbox:main_switched', ({ message }: { message: string }) => {
      if (term) {
        term.writeln(`\r\n✅ ${message}\r\n`);
      }
      logger.debug(`[Terminal] Successfully returned to main terminal`);
    });

    socket.on('sandbox:switch_error', ({ error }: { error: string }) => {
      if (term) {
        term.writeln(`\r\n❌ Sandbox Error: ${error}\r\n`);
      }
      logger.error(`[Terminal] Sandbox switch error: ${error}`);
    });

    // Set up terminal input handling - send to backend
    term.onData((data) => {
      // Send all input to backend via Socket.IO
      if (sessionId && socket.connected) {
        socket.emit('terminal:input', { 
          id: sessionId, 
          data,
          thinkingMode 
        });
        
        // Track current line buffer for command history
        if (data === '\r') {
          // Enter pressed - command was sent
          if (currentLineBuffer.trim()) {
            const command = currentLineBuffer.trim();
            setCommandHistory(prev => [...prev, command]);
            
            // 🚀 Try enhanced command processing first (non-blocking)
            processEnhancedCommand(command).then(enhancedProcessed => {
              // Only notify parent if enhanced processing didn't handle it
              if (!enhancedProcessed && onTerminalCommand) {
                onTerminalCommand(command);
              }
            }).catch(error => {
              logger.error('Enhanced command processing error:', error);
              // Fallback to normal processing
              if (onTerminalCommand) {
                onTerminalCommand(command);
              }
            });
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
                logger.debug('👁️ Supervision auto-activated: claude detected');
              }
              if (onClaudeTyped) {
                onClaudeTyped();
              }
            }
            return newBuffer;
          });
        }
      } else if (!socket.connected) {
        // Show connection status
        logger.debug('Not connected to backend, trying to reconnect...');
      }
    });

    // Note: WebSocket resize events are now handled within the main ResizeObserver
    // to ensure proper coordination with buffer preservation.

    // Note: Resize handling is now consolidated in the main ResizeObserver above
    // to prevent conflicts. The WebSocket resize observer has been removed.
  }, [sessionId, terminalReady]);

  const handleSpawnAgents = async () => {
    if (agentsRunning) {
      // Stop agents
      setAgentsRunning(false);
      xtermRef.current?.writeln('\r\n🛑 Stopping AI agents...');
      
      // Stop the team via backend API
      try {
        const teamId = localStorage.getItem('activeTeamId');
        if (teamId) {
          const response = await fetch(`/api/ai-team/${teamId}/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const result = await response.json();
            xtermRef.current?.writeln(`✅ AI Team stopped (${Math.round(result.duration / 1000)}s runtime)`);
            localStorage.removeItem('activeTeamId');
          }
        }
      } catch (error) {
        logger.error('Failed to stop AI team:', error);
        xtermRef.current?.writeln('⚠️ Team stopped locally (backend unavailable)');
      }
    } else {
      // Start agents
      setAgentsRunning(true);
      setIsConnected(true);
      
      xtermRef.current?.writeln('\r\n⚡ Spawning AI Team...');
      xtermRef.current?.writeln('🤖 Connecting to AI Team Management System...');
      
      try {
        // Get current session ID from localStorage or create new one
        const sessionId = localStorage.getItem('currentSessionId') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('currentSessionId', sessionId);
        
        // Spawn AI team via backend API
        const spawnResponse = await fetch('/api/ai-team/spawn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            projectType: 'web-app',
            complexity: 'medium'
          })
        });
        
        if (!spawnResponse.ok) {
          throw new Error(`HTTP ${spawnResponse.status}`);
        }
        
        const spawnResult = await spawnResponse.json();
        
        if (spawnResult.success) {
          xtermRef.current?.writeln(`✅ Team spawned: ${spawnResult.teamId.slice(-8)}`);
          xtermRef.current?.writeln(`👥 ${spawnResult.agents.length} AI agents initialized:`);
          
          // List each agent with their expertise
          spawnResult.agents.forEach((agent: any, index: number) => {
            const expertise = agent.expertise.slice(0, 2).join(', ');
            xtermRef.current?.writeln(`   ${index + 1}. ${agent.name} - ${expertise}`);
          });
          
          // Start the team working
          xtermRef.current?.writeln('\r\n🚀 Starting AI development work...');
          
          const startResponse = await fetch(`/api/ai-team/${spawnResult.teamId}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });
          
          if (startResponse.ok) {
            const startResult = await startResponse.json();
            xtermRef.current?.writeln('✅ AI Team is now working on your project!');
            xtermRef.current?.writeln('📊 Real-time progress tracking active');
            xtermRef.current?.writeln('👀 LOOK RIGHT! OPEN PREVIEW PANEL TO SEE LIVE PROGRESS →');
            xtermRef.current?.write('\r\n$ ');
            
            // Store team ID for future operations
            localStorage.setItem('activeTeamId', spawnResult.teamId);
            
            // Notify parent component
            onAgentsSpawn?.();
          } else {
            throw new Error('Failed to start team');
          }
          
        } else {
          throw new Error(spawnResult.error || 'Unknown error');
        }
        
      } catch (error) {
        logger.error('AI Team spawn failed:', error);
        xtermRef.current?.writeln(`❌ Failed to spawn AI team: ${error}`);
        xtermRef.current?.writeln('🔧 Ensure backend server is running on port 3000');
        xtermRef.current?.write('\r\n$ ');
        
        // Reset state on failure
        setAgentsRunning(false);
        setIsConnected(false);
      }
    }
  };

  // Add effect to connect to backend when session is ready
  useEffect(() => {
    if (sessionId && terminalReady && xtermRef.current && !socketRef.current) {
      connectToBackend(xtermRef.current);
    }
  }, [sessionId, terminalReady, connectToBackend]);

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
    <div className="h-full flex flex-col bg-bg-primary">
      {/* Terminal Header - Exact 40px height */}
      <div 
        className="flex items-center justify-between border-b border-border-default px-3 bg-bg-secondary border-t border-t-coder1-cyan/50 shadow-glow-cyan"
        style={{ height: spacing.terminalHeader.height }}
      >
        {/* Left section - Edit mode and settings */}
        <div className="flex items-center gap-2">
          {/* Sandbox Mode Indicator */}
          {isSandboxMode && sandboxContext && (
            <div className="flex items-center gap-1 px-2 py-1 bg-coder1-cyan/10 border border-coder1-cyan/30 rounded text-xs">
              <Box className="w-3 h-3 text-coder1-cyan" />
              <span className="text-coder1-cyan font-medium">
                {sandboxContext.projectId}
              </span>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('sandbox-disconnect', {
                    detail: { sandboxId: sandboxContext.sandboxId }
                  }));
                }}
                className="text-coder1-cyan hover:text-coder1-cyan-secondary ml-1"
                title="Disconnect from sandbox"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Enhanced Agents Mode Indicator */}
          {FEATURE_FLAGS.ENHANCED_AGENTS && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
              FEATURE_FLAGS.USE_REAL_AI
                ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40'
                : 'bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30'
            }`}>
              <span className={FEATURE_FLAGS.USE_REAL_AI ? "text-green-400" : "text-purple-400"}>
                {FEATURE_FLAGS.USE_REAL_AI ? '🤖' : '🚀'}
              </span>
              <span className={`font-medium ${
                FEATURE_FLAGS.USE_REAL_AI ? 'text-green-400' : 'text-purple-400'
              }`}>
                {FEATURE_FLAGS.USE_REAL_AI ? 'Real AI Active' : 'Enhanced Agents (Mock)'}
              </span>
            </div>
          )}
          
          {/* Test Environment Link for non-Enhanced Agents users */}
          {!FEATURE_FLAGS.ENHANCED_AGENTS && (
            <button
              onClick={() => window.open('/test-enhanced-agents', '_blank')}
              className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-xs hover:bg-blue-500/20 transition-colors group"
              title="Try enhanced agents safely in our test environment"
            >
              <span className="text-blue-400">🧪</span>
              <span className="text-blue-400 font-medium group-hover:text-blue-300">Test Enhanced Agents</span>
            </button>
          )}

          {/* Voice-to-text button */}
          <button
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

          {/* AI Mastermind button */}
          <button
            onClick={() => {
              xtermRef.current?.writeln('\r\n🧠 AI Mastermind System Activated');
              xtermRef.current?.writeln('\r\n📊 Analyzing current project state...');
              xtermRef.current?.writeln('• Code structure: React + TypeScript');
              xtermRef.current?.writeln('• Components: 15 active');
              xtermRef.current?.writeln('• Dependencies: Next.js, Tailwind, Lucide');
              xtermRef.current?.writeln('');
              xtermRef.current?.writeln('🎯 Strategic Recommendations:');
              xtermRef.current?.writeln('• Optimize component re-renders');
              xtermRef.current?.writeln('• Implement error boundaries');
              xtermRef.current?.writeln('• Add comprehensive testing');
              xtermRef.current?.writeln('• Setup CI/CD pipeline');
              xtermRef.current?.writeln('');
              xtermRef.current?.writeln('Type "mastermind help" for advanced commands');
            }}
            className="terminal-control-btn flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md"
            title="AI Mastermind - Revolutionary AI brainstorming"
          >
            <Brain className="w-4 h-4" />
            <span>AI Mastermind</span>
          </button>

          {/* Enhanced Supervision button */}
          <button
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

          {/* hooks button */}
          <button
            onClick={() => {
              xtermRef.current?.writeln('\r\n🪝 Hooks System Status:');
              xtermRef.current?.writeln('');
              xtermRef.current?.writeln('🔧 Available Hooks:');
              xtermRef.current?.writeln('• pre-commit: Code formatting & linting');
              xtermRef.current?.writeln('• pre-push: Run tests before push');
              xtermRef.current?.writeln('• post-merge: Update dependencies');
              xtermRef.current?.writeln('• on-file-save: Auto-format & validate');
              xtermRef.current?.writeln('');
              xtermRef.current?.writeln('🎣 Custom Hooks:');
              xtermRef.current?.writeln('• ai-review: Auto code review');
              xtermRef.current?.writeln('• security-scan: Vulnerability check');
              xtermRef.current?.writeln('• performance-test: Benchmark changes');
              xtermRef.current?.writeln('');
              xtermRef.current?.writeln('Opening hooks configuration panel...');
              // Simulate opening hooks panel
              setTimeout(() => {
                xtermRef.current?.writeln('\r\nType "hooks list" to see all hooks or "hooks help" for commands.');
              }, 1000);
            }}
            className="terminal-control-btn flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md"
            title="Open hooks management page"
          >
            <Code2 className="w-4 h-4" />
            <span>hooks</span>
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div 
        className="flex-1 p-3 overflow-hidden relative"
        onClick={() => {
          // Focus the terminal when clicked
          if (xtermRef.current) {
            xtermRef.current.focus();
          }
        }}
      >
        <div ref={terminalRef} className="h-full terminal-content" />
      </div>

      {/* Error Doctor */}
      <ErrorDoctor 
        lastError={lastError} 
        isActive={errorDoctorActive} 
      />

      {/* Supervision Configuration Modal */}
      <SupervisionConfigModal 
        isOpen={isConfigModalOpen}
        onClose={() => setConfigModalOpen(false)}
        onSave={saveConfiguration}
        currentConfig={activeConfiguration}
        templates={templates}
      />
      
      {/* Phase 2: Scroll to bottom button - appears when user has scrolled up */}
      {isUserScrolled && (
        <button
          onClick={() => {
            if (xtermRef.current) {
              logger.debug('📜 FOLLOW BUTTON CLICKED');
              try {
                // First try standard method
                xtermRef.current.scrollToBottom();
                
                // Check if it worked, if not force sync
                if (xtermRef.current.buffer && xtermRef.current.buffer.active) {
                  const buffer = xtermRef.current.buffer.active;
                  if (buffer.viewportY !== buffer.baseY) {
                    logger.debug('🔧 BUTTON FORCING VIEWPORT SYNC:', { 
                      viewportY: buffer.viewportY, 
                      baseY: buffer.baseY,
                      scrollLines: buffer.baseY - buffer.viewportY
                    });
                    xtermRef.current.scrollLines(buffer.baseY - buffer.viewportY);
                  }
                }
                
                setIsUserScrolled(false);
                logger.debug('✅ Follow button scroll completed');
              } catch (error) {
                logger.error('❌ FOLLOW BUTTON ERROR:', error);
              }
            }
          }}
          className="scroll-to-follow-btn absolute bottom-24 right-4 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg z-50"
          title="Scroll to bottom and follow output"
        >
          <ChevronDown className="w-4 h-4" />
          <span>Follow Output</span>
        </button>
      )}

      {/* Status Line */}
      {terminalSettings.statusLine.enabled && (
        <div className="absolute bottom-0 left-0 right-0 bg-bg-tertiary border-t border-border-default px-4 py-2 text-xs text-text-secondary flex items-center justify-between">
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