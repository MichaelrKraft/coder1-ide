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
import './Terminal.css';
import { Zap, StopCircle, Brain, Eye, Code2, Mic, MicOff, Speaker, ChevronDown, RefreshCw, Check, Grid } from '@/lib/icons';
import { Cpu } from 'lucide-react';
import TerminalSettings, { TerminalSettingsState } from './TerminalSettings';
import { glows, spacing } from '@/lib/design-tokens';
import { getSocket } from '@/lib/socket';
import { soundAlertService } from '@/lib/sound-alert-service';
import type { SoundPreset } from '@/lib/sound-alert-service';
import { useEnhancedSupervision } from '@/contexts/EnhancedSupervisionContext';
import SupervisionConfigModal from '@/components/supervision/SupervisionConfigModal';
import { universalAIWrapper } from '@/services/ai-platform/universal-ai-wrapper-client';
import { cliDetector, CLIInfo } from '@/services/ai-platform/cli-detector-client';
import { useSessionMemory } from '@/hooks/useSessionMemory';
import SimpleDragDropOverlay from './SimpleDragDropOverlay';
import { stripAnsiCodes } from '@/lib/terminal-cleaner';
import { useTerminalStore } from '@/stores/useTerminalStore';
import { useSpectatorStore } from '@/stores/useSpectatorStore';
import { useTeamStore } from '@/stores/useTeamStore';
import { useAuthStore } from '@/stores/useAuthStore';
import SpectatorTerminal from './SpectatorTerminal';
import { Monitor } from 'lucide-react';

/**
 * Remove emojis from terminal text
 */
const removeEmojis = (text: string): string => {
  return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
};

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface BetaTerminalProps {
  onAgentsSpawn?: () => void;
  onClaudeTyped?: () => void;
  onTerminalData?: (data: string) => void;
  onTerminalCommand?: (command: string) => void;
  onTerminalReady?: (sessionId: string | null, ready: boolean) => void;
}

/**
 * Beta Terminal Component with Multi-AI Platform Support
 * 
 * FEATURES:
 * - Automatic AI platform detection
 * - Platform switching UI
 * - Universal command prefix: "ai:" for any platform
 * - Smart context injection from memory
 * - Platform-specific command translation
 */
function BetaTerminal({ 
  onAgentsSpawn, 
  onClaudeTyped, 
  onTerminalData, 
  onTerminalCommand, 
  onTerminalReady 
}: BetaTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalContainerRef = useRef<HTMLDivElement>(null);  // BETA: Container ref for enhanced scrolling
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdForVoiceRef = useRef<string | null>(null);
  const sessionCreatedRef = useRef(false);
  const onDataDisposableRef = useRef<any>(null);
  const connectionInProgressRef = useRef(false);
  const aiPlatformsInitializedRef = useRef(false);
  const socketRef = useRef<any>(null); // Socket reference like working Terminal
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [agentsRunning, setAgentsRunning] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [terminalReady, setTerminalReady] = useState(false);

  // Spectator Mode state
  const [spectatorScrollback, setSpectatorScrollback] = useState<string>('');
  const [spectatorDims, setSpectatorDims] = useState<{ cols: number; rows: number }>({ cols: 80, rows: 24 });
  const { isSharingTerminal, isSpectating, spectatingSessionId, spectatingUsername, spectatorCount, sharedTerminals } = useSpectatorStore();
  const teamStore = useTeamStore();
  const authStore = useAuthStore();

  // Multi-AI Platform State
  const [availablePlatforms, setAvailablePlatforms] = useState<CLIInfo[]>([]);
  const [activePlatform, setActivePlatform] = useState<CLIInfo | null>(null);
  const [platformSwitching, setPlatformSwitching] = useState(false);
  const [showPlatformSelector, setShowPlatformSelector] = useState(false);
  const [aiSessionId, setAiSessionId] = useState<string | null>(null);
  
  // Claude command detection — use ref to avoid re-render on every keystroke
  const currentLineBufferRef = useRef('');
  const [claudeCodeActive, setClaudeCodeActive] = useState(false);
  
  // Auto-scroll for Claude Code — use xterm's native scrolling only
  const lastScrollTime = useRef<number>(0);
  const forceScrollToBottom = useCallback(() => {
    if (!claudeCodeActive) return;

    const now = Date.now();
    if (now - lastScrollTime.current < 100) return;
    lastScrollTime.current = now;

    xtermRef.current?.scrollToBottom();
  }, [claudeCodeActive]);
  
  // ParaThinker State
  const [paraThinkActive, setParaThinkActive] = useState(false);
  const [paraThinkSessionId, setParaThinkSessionId] = useState<string | null>(null);
  
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
  const [selectedSoundPreset, setSelectedSoundPreset] = useState<SoundPreset>('default' as SoundPreset);
  const [showSoundPresetDropdown, setShowSoundPresetDropdown] = useState(false);
  const soundButtonRef = useRef<HTMLButtonElement>(null);
  const soundDropdownRef = useRef<HTMLDivElement>(null);
  const [recognition, setRecognition] = useState<any | null>(null);
  const [showMemoryDropdown, setShowMemoryDropdown] = useState(false);
  const memoryDropdownRef = useRef<HTMLDivElement>(null);
  const platformDropdownRef = useRef<HTMLDivElement>(null);
  const rawOutputRef = useRef<string>(''); // rolling 3KB of recent raw terminal output
  const [claudeActive, setClaudeActive] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [conversationMode, setConversationMode] = useState(false);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [totalTokens, setTotalTokens] = useState(0);
  const [usageCost, setUsageCost] = useState('$0.0000');

  // Context window tracking (200K tokens = Claude Code standard limit)
  const CONTEXT_WINDOW_MAX = 200_000;
  const contextPercent = Math.min(100, (sessionTokens / CONTEXT_WINDOW_MAX) * 100);
  const [yellowDismissed, setYellowDismissed] = useState(false);
  const [redDismissed, setRedDismissed] = useState(false);
  const [mcpStatus, setMcpStatus] = useState<{ healthy: number; total: number; status: string }>({
    healthy: 0,
    total: 0,
    status: 'unknown'
  });
  
  // Multimodal file handling states
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [blockResetTime, setBlockResetTime] = useState<string>('--:--:--');
  const [isMounted, setIsMounted] = useState(false);
  
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

  // Memory system integration
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const memory = useSessionMemory({
    enabled: memoryEnabled,
    sessionId: sessionIdForVoiceRef.current || `beta_session_${Date.now()}`,
    platform: activePlatform?.name || 'Claude Code',
    autoInject: true
  });

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

  // Fetch context stats (moved from StatusBarCore)
  const fetchContextStats = async () => {
    try {
      console.log('🔍 BetaTerminal: Fetching context stats...');
      setContextStats(prev => ({ ...prev, isLoading: true }));
      
      const response = await fetch('/api/context/stats', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const stats = await response.json();
        console.log('🔍 BetaTerminal: Context stats received:', stats);
        
        const newContextStats = {
          totalSessions: stats.totalSessions || 0,
          totalMemories: stats.totalConversations || 0,
          isActive: (stats.totalConversations || 0) > 0 || (stats.totalSessions || 0) > 0,
          isLoading: false
        };
        
        console.log('🔍 BetaTerminal: Setting context stats:', newContextStats);
        setContextStats(newContextStats);
      } else {
        console.log('🔍 BetaTerminal: Context stats response not ok:', response.status);
        setContextStats(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.log('🔍 BetaTerminal: Context stats fetch failed:', error);
      setContextStats(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Initialize AI platforms on mount
  useEffect(() => {
    console.log('🎯 BetaTerminal: Component mounted, initializing AI platforms');
    setIsMounted(true);
    
    // Fetch context stats on mount and set up interval
    console.log('🔍 BetaTerminal: Calling fetchContextStats from useEffect...');
    fetchContextStats();
    const statsInterval = setInterval(() => {
      console.log('🔍 BetaTerminal: Interval fetchContextStats...');
      fetchContextStats();
    }, 60000); // Update every 60 seconds
    
    // Force re-render after mount to ensure buttons are interactive
    const timer = setTimeout(() => {
      console.log('✅ BetaTerminal: Component fully mounted, buttons should be interactive');
    }, 100);
    
    return () => {
      clearTimeout(timer);
      clearInterval(statsInterval);
    };
  }, []);
  
  // Debug log for component rendering
  useEffect(() => {
    console.log('🔄 BetaTerminal: Component rendered with state:', {
      isConnected,
      agentsRunning,
      voiceListening,
      terminalReady: !!xtermRef.current,
      availablePlatforms: availablePlatforms.length,
      activePlatform: activePlatform?.name || 'none'
    });
  });

  // Handle clicking outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close platform dropdown if clicking outside
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(event.target as Node)) {
        setShowPlatformSelector(false);
      }
      
      // Close memory dropdown if clicking outside
      if (memoryDropdownRef.current && !memoryDropdownRef.current.contains(event.target as Node)) {
        setShowMemoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * Initialize and detect available AI platforms with timeout protection
   */
  const initializeAIPlatforms = async () => {
    // Prevent duplicate initialization
    if (aiPlatformsInitializedRef.current) {
      console.log('BetaTerminal: AI platforms already initialized, skipping');
      return;
    }
    
    aiPlatformsInitializedRef.current = true;
    console.log('BetaTerminal: Starting AI platform initialization with timeout protection');
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI platform initialization timeout')), 3000);
    });
    
    try {
      // Race between initialization and timeout
      await Promise.race([
        universalAIWrapper.initialize(),
        timeoutPromise
      ]);
      
      // Get available platforms
      console.log('BetaTerminal: Getting available platforms');
      const platforms = await universalAIWrapper.getAvailablePlatforms();
      console.log('BetaTerminal: Found platforms:', platforms);
      setAvailablePlatforms(platforms);
      
      // Set active platform
      const active = universalAIWrapper.getActivePlatform();
      console.log('BetaTerminal: Active platform:', active);
      setActivePlatform(active);
      
      // Write welcome message to terminal (always show something)
      if (xtermRef.current) {
        if (platforms.length > 0) {
          xtermRef.current.writeln(removeEmojis('\r\nBeta Terminal with Multi-AI Support'));
          xtermRef.current.writeln(removeEmojis(`Detected ${platforms.length} AI platforms:`));
          platforms.forEach(p => {
            const status = p.authenticated ? '[OK]' : '[NO]';
            xtermRef.current!.writeln(removeEmojis(`  ${status} ${p.name} v${p.version || 'unknown'}`));
          });
          xtermRef.current.writeln(removeEmojis(`\r\nActive: ${active?.name || 'None'}`));
          xtermRef.current.writeln(removeEmojis('Use "ai: <prompt>" to invoke AI or click platform selector\r\n'));
        } else {
          xtermRef.current.writeln(removeEmojis('\r\nTerminal Ready'));
          xtermRef.current.writeln(removeEmojis('AI features not available in this session\r\n'));
        }
      }
    } catch (error) {
      // Log error but don't crash
      if (error instanceof Error && error.message === 'AI platform initialization timeout') {
        console.warn('BetaTerminal: AI platform initialization timed out after 3 seconds');
      } else {
        console.warn('BetaTerminal: AI platform initialization failed:', error);
      }
      
      // Continue without AI features - terminal still works
      setAvailablePlatforms([]);
      setActivePlatform(null);
      
      if (xtermRef.current) {
        xtermRef.current.writeln(removeEmojis('\r\nTerminal Ready'));
        xtermRef.current.writeln(removeEmojis('Running without AI features\r\n'));
      }
    }
  };

  /**
   * Handle platform selection from dropdown
   */
  const handlePlatformSwitch = async (platformName: string) => {
    await switchPlatform(platformName);
  };

  /**
   * Switch to a different AI platform
   */
  const switchPlatform = async (platformName: string) => {
    setPlatformSwitching(true);
    try {
      const success = await universalAIWrapper.switchPlatform(platformName);
      if (success) {
        const newPlatform = availablePlatforms.find(p => p.name === platformName);
        setActivePlatform(newPlatform || null);
        
        if (xtermRef.current) {
          xtermRef.current.writeln(removeEmojis(`\r\nSwitched to ${platformName}\r\n`));
        }
        
        // Play success sound
        if (audioAlertsEnabled) {
          soundAlertService.playCompletionAlert();
        }
      }
    } catch (error) {
      console.error('Failed to switch platform:', error);
      if (xtermRef.current) {
        xtermRef.current.writeln(removeEmojis(`\r\nFailed to switch to ${platformName}\r\n`));
      }
    } finally {
      setPlatformSwitching(false);
      setShowPlatformSelector(false);
    }
  };

  /**
   * Handle ParaThinker command
   */
  const handleParaThinker = async (problem?: string) => {
    try {
      // Use provided problem or get from context
      const problemContext = problem || 
        localStorage.getItem('lastTerminalError') || 
        'Help me solve the current coding problem';
      
      if (xtermRef.current) {
        xtermRef.current.writeln(removeEmojis(`\r\nStarting ParaThinker with parallel reasoning...`));
        xtermRef.current.writeln(removeEmojis(`Problem: ${problemContext.substring(0, 100)}...`));
      }
      
      setParaThinkActive(true);
      
      // Start parallel reasoning
      const response = await fetch('/api/beta/parallel-reasoning/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: problemContext,
          metadata: {
            triggeredBy: 'terminal',
            platform: activePlatform?.name || 'Unknown'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setParaThinkSessionId(data.sessionId);
        
        if (xtermRef.current) {
          xtermRef.current.writeln(removeEmojis(`ParaThinker started with ${data.strategies.length} strategies:`));
          data.strategies.forEach((strategy: string) => {
            xtermRef.current!.writeln(removeEmojis(`  * ${strategy}`));
          });
          xtermRef.current.writeln(removeEmojis(`\r\nSession ID: ${data.sessionId}`));
          xtermRef.current.writeln(removeEmojis(`Use /parathink status to check progress\r\n`));
        }
        
        // Dispatch event to open dashboard in preview panel
        window.dispatchEvent(new CustomEvent('openParaThinkerDashboard', {
          detail: { sessionId: data.sessionId }
        }));
        
        // Play sound if enabled
        if (audioAlertsEnabled) {
          soundAlertService.playCompletionAlert();
        }
      } else {
        throw new Error('Failed to start ParaThinker');
      }
    } catch (error) {
      console.error('ParaThinker error:', error);
      if (xtermRef.current) {
        xtermRef.current.writeln(removeEmojis(`\r\nFailed to start ParaThinker: ${error}\r\n`));
      }
      setParaThinkActive(false);
    }
  };
  
  /**
   * Check ParaThinker status
   */
  const checkParaThinkerStatus = async () => {
    if (!paraThinkSessionId) {
      if (xtermRef.current) {
        xtermRef.current.writeln(removeEmojis(`\r\nNo active ParaThinker session\r\n`));
      }
      return;
    }
    
    try {
      const response = await fetch(`/api/beta/parallel-reasoning/status/${paraThinkSessionId}`);
      if (response.ok) {
        const data = await response.json();
        
        if (xtermRef.current) {
          xtermRef.current.writeln(removeEmojis(`\r\nParaThinker Status: ${data.status}`));
          xtermRef.current.writeln(`Progress: ${data.progress.toFixed(0)}%`);
          xtermRef.current.writeln(`\r\nStrategy Progress:`);
          data.paths.forEach((path: any) => {
            const icon = path.status === 'completed' ? '[DONE]' : 
                        path.status === 'thinking' ? '[RUN]' : 
                        path.status === 'failed' ? '[FAIL]' : '[WAIT]';
            xtermRef.current!.writeln(removeEmojis(`  ${icon} ${path.strategyName}: ${path.progress}%`));
          });
          xtermRef.current.writeln('');
        }
        
        // If completed, get results
        if (data.status === 'completed') {
          const resultsResponse = await fetch(`/api/beta/parallel-reasoning/results/${paraThinkSessionId}`);
          if (resultsResponse.ok) {
            const results = await resultsResponse.json();
            if (xtermRef.current && results.finalSolution) {
              xtermRef.current.writeln(removeEmojis(`\r\nFinal Solution:`));
              xtermRef.current.writeln(results.finalSolution);
              xtermRef.current.writeln(removeEmojis(`\r\nConfidence: ${results.votingResults?.confidence.toFixed(0)}%\r\n`));
            }
            setParaThinkActive(false);
          }
        }
      }
    } catch (error) {
      console.error('Status check error:', error);
      if (xtermRef.current) {
        xtermRef.current.writeln(removeEmojis(`\r\nFailed to check status: ${error}\r\n`));
      }
    }
  };

  /**
   * Handle AI command with universal prefix
   */
  const handleAICommand = async (command: string) => {
    // Check for ParaThinker commands first
    if (command.startsWith('/parathink')) {
      const parts = command.split(' ');
      if (parts[1] === 'status') {
        await checkParaThinkerStatus();
        return;
      } else {
        // Get problem from command or use default
        const problem = parts.slice(1).join(' ').trim();
        await handleParaThinker(problem || undefined);
        return;
      }
    }
    
    // Check if command starts with "ai:" prefix
    const aiPrefix = /^ai:\s*/i;
    const platformPrefix = /^(\w+):\s*/i;
    
    let prompt = command;
    let targetPlatform: string | undefined;
    
    if (aiPrefix.test(command)) {
      // Universal AI command
      prompt = command.replace(aiPrefix, '').trim();
    } else {
      // Check for platform-specific prefix (e.g., "claude:", "openai:", "aider:")
      const match = command.match(platformPrefix);
      if (match) {
        const platformName = match[1].toLowerCase();
        const platform = availablePlatforms.find(p => 
          p.name.toLowerCase().includes(platformName) || 
          p.command.toLowerCase().includes(platformName)
        );
        
        if (platform) {
          targetPlatform = platform.name;
          prompt = command.replace(platformPrefix, '').trim();
        }
      }
    }
    
    // Execute AI command if we have a valid prompt
    if (prompt && (aiPrefix.test(command) || targetPlatform)) {
      if (xtermRef.current) {
        xtermRef.current.writeln(removeEmojis(`\r\nProcessing with ${targetPlatform || activePlatform?.name || 'AI'}...\r\n`));
      }
      
      try {
        // Inject memory context if enabled
        let contextualPrompt = prompt;
        if (memory.isEnabled && memory.isActive) {
          const memoryContext = await memory.getInjectionContext();
          if (memoryContext) {
            contextualPrompt = `${memoryContext}\n\n${prompt}`;
          }
        }

        // Execute through universal wrapper
        const response = await universalAIWrapper.execute({
          platform: targetPlatform,
          prompt: contextualPrompt,
          sessionId: aiSessionId || undefined,
          stream: true
        });
        
        // Store session ID for context continuity
        if (response.sessionId && !aiSessionId) {
          setAiSessionId(response.sessionId);
        }
        
        // Update token usage
        if (response.tokensUsed) {
          setSessionTokens(prev => prev + response.tokensUsed!);
          setTotalTokens(prev => prev + response.tokensUsed!);
        }
        
        // Write response to terminal
        if (xtermRef.current && response.response) {
          xtermRef.current.writeln(response.response);
          xtermRef.current.writeln('');
        }

        // Add to memory if enabled
        if (memory.isEnabled && response.response) {
          await memory.addInteraction(prompt, response.response, 'command');
        }
        
      } catch (error) {
        console.error('AI command failed:', error);
        if (xtermRef.current) {
          xtermRef.current.writeln(removeEmojis(`\r\nAI command failed: ${error}\r\n`));
        }
      }
    }
  };

  // Create terminal session on mount - EXACTLY like Terminal.tsx
  useEffect(() => {
    // Prevent duplicate session creation
    if (sessionCreatedRef.current) {
      console.log('🔄 Beta Terminal: Session already created, skipping');
      return;
    }
    
    const createTerminalSession = async () => {
      // Check if there's already a session in localStorage (from SessionContext)
      const existingSessionId = localStorage.getItem('currentSessionId');
      if (existingSessionId) {
        // Use existing session instead of creating new one
        sessionCreatedRef.current = true;
        setSessionId(existingSessionId);
        sessionIdForVoiceRef.current = existingSessionId;
        setTerminalReady(true);
        if (onTerminalReady) {
          onTerminalReady(existingSessionId, true);
        }
        return;
      }
      
      sessionCreatedRef.current = true;
      console.log('🚀 BETA TERMINAL: Creating terminal session...');
      
      try {
        // Create a real terminal session via the backend
        console.log('📡 Beta Terminal: Calling /api/terminal-rest/sessions...');
        const response = await fetch('/api/terminal-rest/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cols: 130,
            rows: 30,
          }),
        });
        
        console.log('📡 Beta Terminal: Session response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📡 Beta Terminal: Session response data:', data);
          setSessionId(data.sessionId);
          // Immediately update the ref for voice recognition
          sessionIdForVoiceRef.current = data.sessionId;
          setTerminalReady(true);
          // Notify parent component
          if (onTerminalReady) {
            onTerminalReady(data.sessionId, true);
          }
          console.log('✅ Beta Terminal: Session created:', data.sessionId);
        } else {
          console.error('Failed to create terminal session:', response.status);
          // Fallback to simulated mode
          const simulatedId = 'simulated-' + Date.now();
          setSessionId(simulatedId);
          sessionIdForVoiceRef.current = simulatedId;
          setTerminalReady(true);
          if (onTerminalReady) {
            onTerminalReady(simulatedId, true);
          }
        }
      } catch (error) {
        console.error('Error creating terminal session:', error);
        // Fallback to simulated mode
        const simulatedId = 'simulated-' + Date.now();
        setSessionId(simulatedId);
        sessionIdForVoiceRef.current = simulatedId;
        setTerminalReady(true);
        if (onTerminalReady) {
          onTerminalReady(simulatedId, true);
        }
      }
    };
    
    createTerminalSession();
  }, []); // Empty dependency array - only run on mount

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    if (!XTerm) {
      console.error('XTerm not loaded - running in SSR environment');
      return;
    }

    const term = new XTerm({
      theme: {
        background: '#1a1b26',    // Tokyo Night background
        foreground: '#a9b1d6',   // Tokyo Night foreground
        cursor: '#bb9af7',       // Tokyo Night purple cursor
        black: '#414868',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#bb9af7',
        cyan: '#7dcfff',
        white: '#c0caf5',
        brightBlack: '#414868',
        brightRed: '#f7768e',
        brightGreen: '#9ece6a',
        brightYellow: '#e0af68',
        brightBlue: '#7aa2f7',
        brightMagenta: '#bb9af7',
        brightCyan: '#7dcfff',
        brightWhite: '#c0caf5'
      },
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Consolas, monospace',
      cursorBlink: true,
      convertEol: true,
      scrollback: 10000,
      allowProposedApi: true,
    });

    if (!FitAddon) {
      console.error('FitAddon not loaded - running in SSR environment');
      return;
    }
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.open(terminalRef.current);

    // Fit synchronously after opening so dimensions are ready for connectToBackend()
    // But defer focus to next tick so the DOM element is fully rendered first
    try {
      fitAddon.fit();
    } catch (e) {
      // May fail if container isn't fully rendered yet
      // connectToBackend() will retry fit() before emitting terminal:create
      console.warn('Initial fitAddon.fit() failed, will retry on connect:', e);
    }

    // IMPORTANT: Focus must be deferred - calling synchronously after term.open()
    // can silently fail because the DOM element may not be fully rendered yet
    setTimeout(() => {
      term.focus();
    }, 0);

    // Initialize AI platforms after terminal is ready (only once)
    if (!sessionCreatedRef.current) {
      // Initialize AI platforms in a non-blocking way
      setTimeout(() => {
        console.log('BetaTerminal: Starting non-blocking AI platform initialization');
        initializeAIPlatforms().catch(error => {
          console.warn('BetaTerminal: AI initialization failed (non-critical):', error);
        });
      }, 100); // Small delay to ensure terminal is fully ready
    }

    return () => {
      resizeObserverRef.current?.disconnect();
      term.dispose();
      xtermRef.current = null;
    };
  }, []);

  // Connect to backend when both terminal and session are ready - EXACTLY like Terminal.tsx
  useEffect(() => {
    if (sessionId && terminalReady && xtermRef.current && !isConnected && !connectionInProgressRef.current) {
      console.log('🚀 Beta Terminal: Both terminal and session ready, connecting to backend...');
      connectToBackend(xtermRef.current);
    }
  }, [sessionId, terminalReady, isConnected]);

  // Connect to backend function - EXACTLY like Terminal.tsx
  const connectToBackend = async (term: XTerm) => {
    console.log('🔌 BETA TERMINAL: Connecting to backend:', { sessionId, terminalReady });
    
    // Prevent concurrent connections
    if (connectionInProgressRef.current) {
      console.log('⚠️ Beta Terminal: Connection already in progress, skipping...');
      return;
    }
    
    if (!sessionId || !terminalReady) {
      console.log('❌ Beta Terminal: Session not ready yet:', { sessionId, terminalReady });
      return;
    }
    
    // Mark connection as in progress
    connectionInProgressRef.current = true;

    // Get Socket.IO instance
    console.log('🔧 Beta Terminal: Getting Socket.IO instance...');
    const socket = await getSocket();
    console.log('✅ Beta Terminal: Socket.IO instance obtained:', socket.connected ? 'CONNECTED' : 'DISCONNECTED');
    socketRef.current = socket;
    
    // Focus terminal immediately when backend is connected
    const focusOnConnect = () => {
      if (term && !term.element?.contains(document.activeElement)) {
        setTimeout(() => {
          try {
            term.focus();
            console.log('✅ Beta Terminal: Focused after backend connection');
          } catch (error) {
            console.warn('Could not focus terminal after connection:', error);
          }
        }, 100);
      }
    };

    // 🔧 FIX (Jan 27, 2026): Track if we've already emitted terminal:create to prevent duplicates
    // This flag prevents double welcome boxes when socket is already connected
    let hasEmittedCreate = false;

    // Add connection status listeners
    socket.on('connect', () => {
      console.log('🟢 Beta Terminal: Socket.IO CONNECTED to backend');
      // If reconnecting AND we haven't already emitted, re-establish terminal session
      if (isConnected && sessionId && hasEmittedCreate) {
        // Only re-emit on ACTUAL reconnection (not initial connection)
        console.log('🔄 Beta Terminal: Reconnected - re-establishing terminal session');

        // Re-measure dimensions before reconnection
        if (fitAddonRef.current && xtermRef.current) {
          try {
            fitAddonRef.current.fit();
          } catch (e) {
            console.warn('fitAddon.fit() failed on reconnect:', e);
          }
        }

        const reconnectCols = xtermRef.current?.cols ?? 80;
        const reconnectRows = xtermRef.current?.rows ?? 24;

        socket.emit('terminal:create', { id: sessionId, cols: reconnectCols, rows: reconnectRows });
        focusOnConnect();
      }
    });
    
    socket.on('disconnect', (reason) => {
      console.log('🔴 Beta Terminal: Socket.IO DISCONNECTED:', reason);
      if (term) {
        term.writeln(`\r\n⚠️ Connection lost: ${reason}`);
      }
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Beta Terminal: Socket.IO CONNECTION ERROR:', error);
    });

    // CRITICAL: Measure actual dimensions BEFORE emitting terminal:create
    // fitAddon.fit() calculates dimensions based on current container size
    if (fitAddonRef.current && xtermRef.current) {
      try {
        fitAddonRef.current.fit();
      } catch (e) {
        console.warn('fitAddon.fit() failed before terminal:create:', e);
      }
    }

    // Get measured dimensions with validation
    const measuredCols = xtermRef.current?.cols ?? 0;
    const measuredRows = xtermRef.current?.rows ?? 0;

    // Validate: use measured dimensions only if they look reasonable
    // If container is hidden/minimized, fall back to safe defaults
    const cols = measuredCols >= 10 ? measuredCols : 80;
    const rows = measuredRows >= 5 ? measuredRows : 24;

    console.log('📡 Beta Terminal: Emitting terminal:create with measured dimensions:',
      { cols, rows, raw: { measuredCols, measuredRows } });
    socket.emit('terminal:create', {
      id: sessionId,
      cols,
      rows,
    });
    hasEmittedCreate = true; // 🔧 FIX: Mark that initial create has been emitted

    // Handle terminal output from backend
    socket.on('terminal:data', ({ id, data }: { id: string; data: string }) => {
      if (id === sessionId && term) {
        term.write(data);

        // Buffer recent output for session handoff (keep last 3KB)
        rawOutputRef.current = (rawOutputRef.current + data).slice(-3000);

        // Only run expensive checks on multi-char output (not single keystroke echo)
        if (data.length > 1) {
          // Auto-scroll
          if (claudeCodeActive) {
            forceScrollToBottom();
          } else {
            term.scrollToBottom();
          }

          // Check for AI command patterns
          if (data.includes('ai:') || data.includes('claude:') || data.includes('/parathink')) {
            const lines = data.split('\n');
            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine && (trimmedLine.startsWith('/parathink') || trimmedLine.includes('ai:') || trimmedLine.includes('claude:'))) {
                handleAICommand(trimmedLine);
              }
            }
          }

          // Store errors for ParaThinker context
          if (data.toLowerCase().includes('error') || data.includes('❌')) {
            localStorage.setItem('lastTerminalError', data.slice(-500));
          }
        }

        // Detect CWD from shell prompt patterns or plain pwd output
        if (data.length > 1) {
          // Match path inside a shell prompt (bash/zsh/oh-my-zsh)
          const promptMatch = data.match(/(?:^|\r|\n)[^$%❯➜\r\n]*(?:[$%❯➜])[^$%❯➜\r\n]*?((?:~|\/)[^\s\r\n$%❯➜]+)/);
          // Match plain pwd output: a line that is just an absolute path
          const pwdMatch = !promptMatch && data.match(/(?:^|\r|\n)(\/[^\s\r\n:*?"<>|]+)(?:\r|\n|$)/);
          const extractedPath = (promptMatch && promptMatch[1]) || (pwdMatch && pwdMatch[1]) || null;
          if (extractedPath) {
            const currentCwd = useTerminalStore.getState().workingDirectory;
            if (extractedPath !== currentCwd) {
              useTerminalStore.getState().setWorkingDirectory(extractedPath);
            }
          }
        }

        // Capture terminal output (lightweight callback, always fire)
        if (onTerminalData) {
          onTerminalData(data);
        }
      }
    });

    // Handle terminal creation confirmation
    socket.on('terminal:created', ({ id }: { id: string }) => {
      if (id === sessionId) {
        console.log('✅ Beta Terminal: Connected to backend');
        // Write connection message to terminal
        if (term) {
          term.write('\r\n✅ Connected to backend terminal\r\n');
        }
        setIsConnected(true);
        connectionInProgressRef.current = false; // Connection complete
        
        // Focus terminal after successful connection
        focusOnConnect();
        
        // Send initial resize
        if (fitAddonRef.current && xtermRef.current) {
          const { cols, rows } = xtermRef.current;
          socket.emit('terminal:resize', { id: sessionId, cols, rows });
        }

        // Request initial CWD so the store is populated on connect
        setTimeout(() => {
          socket.emit('terminal:input', { id: sessionId, data: 'pwd\r' });
        }, 500);
      }
    });

    // Spectator Mode: Listen for spectator events
    // Remove previous listeners first to prevent duplicates on reconnect
    socket.off('spectator:share:started');
    socket.off('spectator:share:stopped');
    socket.off('spectator:viewer:joined');
    socket.off('spectator:viewer:left');
    socket.off('spectator:joined');

    socket.on('spectator:share:started', (data: { sessionId: string; userId: string; username: string; cols: number; rows: number }) => {
      useSpectatorStore.getState().addSharedTerminal(data);
    });

    socket.on('spectator:share:stopped', ({ sessionId: stoppedId }: { sessionId: string }) => {
      useSpectatorStore.getState().removeSharedTerminal(stoppedId);
      // If currently spectating this terminal, exit spectator mode
      const { spectatingSessionId, stopSpectating } = useSpectatorStore.getState();
      if (spectatingSessionId === stoppedId) {
        stopSpectating();
      }
    });

    socket.on('spectator:viewer:joined', ({ count }: { count: number }) => {
      useSpectatorStore.getState().setSpectatorCount(count);
    });

    socket.on('spectator:viewer:left', ({ count }: { count: number }) => {
      useSpectatorStore.getState().setSpectatorCount(count);
    });

    socket.on('spectator:joined', ({ sessionId: sid, scrollback, cols, rows, sharerUsername }: { sessionId: string; scrollback: string; cols: number; rows: number; sharerUsername: string }) => {
      setSpectatorScrollback(scrollback || '');
      setSpectatorDims({ cols, rows });
      useSpectatorStore.getState().startSpectating(sid, sharerUsername);
    });

    // Handle errors
    socket.on('terminal:error', ({ message }: { message: string }) => {
      console.error('Beta Terminal error:', message);
      term.writeln(`\r\n❌ Terminal error: ${message}`);
      setIsConnected(false);
      connectionInProgressRef.current = false; // Connection failed
    });

    // CRITICAL: Set up terminal input handling - send to backend
    // Clean up any existing handler first
    if (onDataDisposableRef.current) {
      onDataDisposableRef.current.dispose();
      onDataDisposableRef.current = null;
    }
    
    // Create new handler and store the disposable - AFTER socket is ready
    onDataDisposableRef.current = term.onData((data) => {
      // Handle Ctrl+L to clear terminal
      if (data === '\f' || data === '\x0c') {
        term.clear();
        term.write('\r\n✅ Terminal cleared (Ctrl+L)\r\n$ ');
        return;
      }
      
      // Check connection status
      if (!sessionId) {
        term.writeln('\r\n⚠️ Terminal session not initialized. Please refresh the page.');
        return;
      }
      
      if (!socket.connected) {
        term.writeln('\r\n⚠️ Socket not connected. Trying to reconnect...');
        return;
      }
      
      // Send input to backend via Socket.IO
      socket.emit('terminal:input', { 
        id: sessionId, 
        data 
      });
      
      // Handle Claude command detection
      if (data === '\r' || data === '\n') {
        const currentBuffer = currentLineBufferRef.current.trim();
        // Check if it's a new command (not a Claude Code continuation)
        if (currentBuffer && !currentBuffer.toLowerCase().includes('claude') && claudeCodeActive) {
          setClaudeCodeActive(false);
          console.log('🎯 Beta Terminal: New command detected - deactivating Claude Code padding');
        }
        currentLineBufferRef.current = '';
      } else if (data === '\u007f' || data === '\b') {
        currentLineBufferRef.current = currentLineBufferRef.current.slice(0, -1);
      } else if (data >= ' ' || data === '\t') {
        const newBuffer = currentLineBufferRef.current + data;
        currentLineBufferRef.current = newBuffer;
        if (newBuffer.toLowerCase().includes('claude')) {
          if (!isSupervisionActive) {
            enableSupervision();
            console.log('👁️ Beta Terminal: Supervision auto-activated - claude detected');
          }
          if (onClaudeTyped) {
            onClaudeTyped();
          }
          // Activate Claude Code padding only if not already active
          if (!claudeCodeActive) {
            setClaudeCodeActive(true);
            console.log('🎯 Beta Terminal: Claude Code detected - activating dynamic padding');
          }
        }
      }
      
      if (onTerminalCommand) {
        onTerminalCommand(data);
      }
    });

    // Handle resize — always fit xterm, only notify server when connected
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        if (socket.connected) {
          const { cols, rows } = xtermRef.current;
          socket.emit('terminal:resize', { id: sessionId, cols, rows });
        }
      }
    };

    // Only resize terminal on actual WINDOW resizes, not sidebar/panel drags.
    // Sidebar drags change the container size but shouldn't reflow terminal text -
    // Claude Code's TUI gets garbled when dimensions change during panel resizing.
    // The terminal keeps its dimensions and the container clips overflow.
    if (terminalRef.current && terminalRef.current.parentElement) {
      resizeObserverRef.current?.disconnect();

      let isFirstResize = true;
      let lastWindowWidth = window.innerWidth;
      let lastWindowHeight = window.innerHeight;

      const resizeObserver = new ResizeObserver(() => {
        const currentWindowWidth = window.innerWidth;
        const currentWindowHeight = window.innerHeight;
        const isWindowResize = (
          currentWindowWidth !== lastWindowWidth ||
          currentWindowHeight !== lastWindowHeight
        );
        lastWindowWidth = currentWindowWidth;
        lastWindowHeight = currentWindowHeight;

        // Only reflow on actual window resize or first resize after connect.
        // Panel/sidebar drags are ignored - terminal keeps its dimensions.
        if (!isWindowResize && !isFirstResize) {
          return;
        }

        if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);

        const debounceMs = isFirstResize ? 50 : 250;

        resizeTimerRef.current = setTimeout(() => {
          handleResize();
          isFirstResize = false;
        }, debounceMs);
      });
      resizeObserver.observe(terminalRef.current.parentElement);
      resizeObserverRef.current = resizeObserver;
    }
  };

  // Auto-focus terminal after mount (like working Terminal)
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      if (xtermRef.current && terminalRef.current) {
        try {
          xtermRef.current.focus();
          console.log('✅ Beta Terminal auto-focused on mount');
        } catch (error) {
          console.warn('Could not auto-focus Beta terminal:', error);
        }
      }
    }, 500);

    return () => clearTimeout(focusTimer);
  }, []);

  // Listen for checkpoint restoration events
  useEffect(() => {
    const handleCheckpointRestored = (event: CustomEvent) => {
      console.log('🔄 BetaTerminal: Checkpoint restoration event received', event.detail);
      
      // For checkpointRestored event: { checkpoint, snapshot }
      const checkpoint = event.detail?.checkpoint;
      const snapshot = event.detail?.snapshot;
      const terminalData = snapshot?.terminal;
      const conversationHistory = checkpoint?.data?.conversationHistory;
      
      if (!xtermRef.current) {
        console.log('⚠️ BetaTerminal: Terminal not initialized yet');
        return;
      }
      
      // Clear current terminal
      xtermRef.current.clear();
      
      // ENHANCED: Display conversation history first if available
      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        console.log(`📚 BetaTerminal: Restoring ${conversationHistory.length} previous conversations`);
        
        // Display conversation history header
        xtermRef.current.write('\r\n\x1b[38;5;174m══════════════════════════════════════════════════════════════════════════════════════════════════════════\x1b[0m\r\n');
        xtermRef.current.write('\x1b[38;5;174m📂 Session restored from checkpoint with conversation history\x1b[0m\r\n');
        xtermRef.current.write('\x1b[38;5;174m══════════════════════════════════════════════════════════════════════════════════════════════════════════\x1b[0m\r\n\r\n');
        
        // Display each conversation
        conversationHistory.forEach((conversation: any, index: number) => {
          if (conversation.user_input && conversation.claude_reply) {
            xtermRef.current?.write(`\x1b[38;5;147m💬 You:\x1b[0m ${conversation.user_input}\r\n\r\n`);
            const response = conversation.claude_reply.length > 500 
              ? conversation.claude_reply.substring(0, 500) + '...'
              : conversation.claude_reply;
            xtermRef.current?.write(`\x1b[38;5;174m🤖 Claude:\x1b[0m ${response}\r\n\r\n`);
          }
        });
        
        // Add separator between conversation history and terminal data
        xtermRef.current.write('\r\n\x1b[38;5;174m══════════════════════════════════════════════════════════════════════════════════════════════════════════\x1b[0m\r\n');
        xtermRef.current.write('\x1b[38;5;174m📟 Terminal session data:\x1b[0m\r\n');
        xtermRef.current.write('\x1b[38;5;174m══════════════════════════════════════════════════════════════════════════════════════════════════════════\x1b[0m\r\n\r\n');
      }
      
      if (!terminalData || typeof terminalData !== 'string') {
        if (!conversationHistory?.length) {
          console.log('⚠️ BetaTerminal: No terminal data or conversation history in checkpoint');
          xtermRef.current.write('\r\n\x1b[38;5;174m📂 Empty checkpoint - no terminal or conversation data to restore\x1b[0m\r\n\r\n');
        }
        return;
      }
      
      // Restore terminal history
      console.log(`📜 BetaTerminal: Restoring terminal session from checkpoint`);
      
      // Apply defensive filtering to remove any statusline artifacts that may have slipped through
      // This provides double protection against statusline message replay
      let cleanedData = terminalData;
      
      // Remove statusline control hints patterns as a final safeguard
      cleanedData = cleanedData.replace(/.*\(esc to interrupt.*?ctrl\+t.*?\).*$/gm, '');
      cleanedData = cleanedData.replace(/.*ctrl\+t to show todos.*$/gm, '');
      cleanedData = cleanedData.replace(/^\s*⎿\s*Next:.*$/gm, '');
      cleanedData = cleanedData.replace(/^[✶✳✢·✻✽✦☆★▪▫◆◇○●]\s+.*?\(esc to interrupt.*?\).*$/gm, '');
      cleanedData = cleanedData.replace(/\x1b\[<[\d;]+[Mm]/g, '');  // SGR mouse sequences
      cleanedData = cleanedData.replace(/\x1b\[M[\x20-\x7f]{3}/g, ''); // X11 mouse sequences

      // Write the cleaned terminal data
      xtermRef.current.write(cleanedData);
      
      // Add a separator to show where restoration ends
      xtermRef.current.writeln('\r\n' + '='.repeat(50));
      xtermRef.current.writeln('📂 Terminal session restoration complete');
      xtermRef.current.writeln('='.repeat(50) + '\r\n');
      
      // Focus terminal after restoration
      setTimeout(() => {
        if (xtermRef.current) {
          xtermRef.current.focus();
        }
      }, 100);
    };
    
    const handleIdeStateChanged = (event: CustomEvent) => {
      if (event.detail?.type === 'checkpoint-restored') {
        // For ideStateChanged: event.detail.data IS the snapshot, checkpoint might be in event.detail.checkpoint
        const terminalData = event.detail?.data?.terminal;
        const checkpoint = event.detail?.checkpoint;
        const conversationHistory = checkpoint?.data?.conversationHistory;
        
        if (!xtermRef.current) {
          console.log('⚠️ BetaTerminal: Terminal not initialized yet');
          return;
        }
        
        // Clear terminal
        xtermRef.current.clear();
        
        // ENHANCED: Display conversation history first if available
        if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
          console.log(`📚 BetaTerminal: Restoring ${conversationHistory.length} previous conversations from IDE state change`);
          
          // Display conversation history header
          xtermRef.current.write('\r\n\x1b[38;5;174m══════════════════════════════════════════════════════════════════════════════════════════════════════════\x1b[0m\r\n');
          xtermRef.current.write('\x1b[38;5;174m📂 Session restored from IDE state change with conversation history\x1b[0m\r\n');
          xtermRef.current.write('\x1b[38;5;174m══════════════════════════════════════════════════════════════════════════════════════════════════════════\x1b[0m\r\n\r\n');
          
          // Display each conversation
          conversationHistory.forEach((conversation: any, index: number) => {
            if (conversation.user_input && conversation.claude_reply) {
              xtermRef.current?.write(`\x1b[38;5;147m💬 You:\x1b[0m ${conversation.user_input}\r\n\r\n`);
              const response = conversation.claude_reply.length > 500 
                ? conversation.claude_reply.substring(0, 500) + '...'
                : conversation.claude_reply;
              xtermRef.current?.write(`\x1b[38;5;174m🤖 Claude:\x1b[0m ${response}\r\n\r\n`);
            }
          });
          
          // Add separator between conversation history and terminal data
          xtermRef.current.write('\r\n\x1b[38;5;174m══════════════════════════════════════════════════════════════════════════════════════════════════════════\x1b[0m\r\n');
          xtermRef.current.write('\x1b[38;5;174m📟 Terminal session data:\x1b[0m\r\n');
          xtermRef.current.write('\x1b[38;5;174m══════════════════════════════════════════════════════════════════════════════════════════════════════════\x1b[0m\r\n\r\n');
        }
        
        if (!terminalData || typeof terminalData !== 'string') {
          if (!conversationHistory?.length) {
            console.log('⚠️ BetaTerminal: No terminal data or conversation history in IDE state change');
            xtermRef.current.write('\r\n\x1b[38;5;174m📂 Empty checkpoint - no terminal or conversation data to restore\x1b[0m\r\n\r\n');
          }
          return;
        }
        
        // Restore terminal
        console.log(`📜 BetaTerminal: Restoring terminal from IDE state change`);
        
        // Apply defensive filtering to remove any statusline artifacts (same as checkpoint restore)
        let cleanedData = terminalData;
        cleanedData = cleanedData.replace(/.*\(esc to interrupt.*?ctrl\+t.*?\).*$/gm, '');
        cleanedData = cleanedData.replace(/.*ctrl\+t to show todos.*$/gm, '');
        cleanedData = cleanedData.replace(/^\s*⎿\s*Next:.*$/gm, '');
        cleanedData = cleanedData.replace(/^[✶✳✢·✻✽✦☆★▪▫◆◇○●]\s+.*?\(esc to interrupt.*?\).*$/gm, '');
        cleanedData = cleanedData.replace(/\x1b\[<[\d;]+[Mm]/g, '');  // SGR mouse sequences
        cleanedData = cleanedData.replace(/\x1b\[M[\x20-\x7f]{3}/g, ''); // X11 mouse sequences

        xtermRef.current.write(cleanedData);
        
        // Add separator
        xtermRef.current.writeln('\r\n' + '='.repeat(50));
        xtermRef.current.writeln('📂 IDE state restoration complete');
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
    window.addEventListener('checkpointRestored', handleCheckpointRestored as any);
    window.addEventListener('ideStateChanged', handleIdeStateChanged as any);
    
    return () => {
      window.removeEventListener('checkpointRestored', handleCheckpointRestored as any);
      window.removeEventListener('ideStateChanged', handleIdeStateChanged as any);
    };
  }, []);

  // Aggressive focus management - click anywhere on terminal container to focus
  const handleTerminalClick = useCallback(() => {
    if (xtermRef.current) {
      try {
        xtermRef.current.focus();
        console.log('✅ Beta Terminal: Focused on click');
      } catch (error) {
        console.warn('Could not focus terminal on click:', error);
      }
    }
  }, []);

  // Focus on visibility changes (tab switching, window focus)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && xtermRef.current) {
        setTimeout(() => {
          try {
            xtermRef.current.focus();
            console.log('✅ Beta Terminal: Re-focused after visibility change');
          } catch (error) {
            console.warn('Could not focus after visibility change:', error);
          }
        }, 100);
      }
    };

    const handleWindowFocus = () => {
      if (xtermRef.current) {
        setTimeout(() => {
          try {
            xtermRef.current.focus();
            console.log('✅ Beta Terminal: Re-focused after window focus');
          } catch (error) {
            console.warn('Could not focus after window focus:', error);
          }
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // Existing handlers (keep all the original ones)
  const handleSpawnAgents = async () => {
    console.log('🚀 BetaTerminal: AI Team button clicked');
    try {
      setAgentsRunning(true);
      if (onAgentsSpawn) {
        onAgentsSpawn();
      }
      
      // Use AI Team with selected platform
      if (activePlatform) {
        const response = await universalAIWrapper.execute({
          platform: activePlatform.name,
          prompt: 'Help me build a complete web application with authentication and database',
          sessionId: aiSessionId || undefined
        });
        
        if (xtermRef.current && response.response) {
          xtermRef.current.writeln(removeEmojis(`\r\n${activePlatform.name} Team Response:\r\n`));
          xtermRef.current.writeln(response.response);
        }
      } else {
        console.log('⚠️ No active AI platform, showing message in terminal');
        if (xtermRef.current) {
          xtermRef.current.writeln(removeEmojis('\r\nNo AI platform detected. AI Team features unavailable.\r\n'));
        }
      }
    } catch (error) {
      console.error('❌ BetaTerminal: Error in handleSpawnAgents:', error);
      if (xtermRef.current) {
        xtermRef.current.writeln(removeEmojis(`\r\nError spawning AI team: ${error}\r\n`));
      }
    } finally {
      setTimeout(() => setAgentsRunning(false), 3000);
    }
  };

  const toggleVoice = () => {
    console.log('🎤 BetaTerminal: Voice button clicked, current state:', voiceListening);
    try {
      setVoiceListening(!voiceListening);
      if (audioAlertsEnabled) {
        soundAlertService.testSound();
      }
    } catch (error) {
      console.error('❌ BetaTerminal: Error in toggleVoice:', error);
    }
  };

  const handleAudioToggle = () => {
    const newState = !audioAlertsEnabled;
    setAudioAlertsEnabled(newState);
    
    if (newState) {
      soundAlertService.testSound();
    }
  };

  // Handle Claude CLI bridge results
  const handleClaudeBridge = useCallback((bridgeResult: any) => {
    try {
      if (xtermRef.current) {
        if (bridgeResult.error) {
          xtermRef.current.writeln(`\r\n❌ Claude CLI Bridge Error: ${bridgeResult.error}`);
        } else {
          xtermRef.current.writeln(`\r\n🌉 Claude CLI Bridge: ${bridgeResult.message}`);
          
          if (bridgeResult.sessionBridge?.claudeCommand) {
            xtermRef.current.writeln(`\r\n💡 Ready to run:`);
            xtermRef.current.writeln(`   ${bridgeResult.sessionBridge.claudeCommand}`);
            
            // Direct injection: Add command to terminal input buffer
            setTimeout(() => {
              if (xtermRef.current) {
                // Write a new prompt and the command
                xtermRef.current.write('\r\n$ ');
                // Type the command character by character to simulate user input
                const command = bridgeResult.sessionBridge.claudeCommand;
                let index = 0;
                const typeCommand = () => {
                  if (index < command.length && xtermRef.current) {
                    xtermRef.current.write(command[index]);
                    index++;
                    setTimeout(typeCommand, 50); // 50ms delay between characters
                  }
                };
                typeCommand();
              }
            }, 1000); // 1 second delay before injection
          }
          
          if (bridgeResult.sessionBridge?.filesCount) {
            xtermRef.current.writeln(`\r\n📁 ${bridgeResult.sessionBridge.filesCount} file(s) now accessible by Claude CLI`);
            xtermRef.current.writeln(`\r\n⌨️  Command will be injected in 1 second...`);
          }
        }
      }
    } catch (error) {
      console.error('Error handling Claude bridge result:', error);
    }
  }, []);

  // Multimodal file handling
  const handleFileDrop = async (files: File[]) => {
    setIsProcessingFiles(true);
    setDroppedFiles(files);
    
    try {
      // Send to terminal for user feedback
      if (xtermRef.current) {
        xtermRef.current.writeln(`\r\n📎 ${files.length} file(s) received. Processing with multimodal AI...`);
        
        // Show file details
        for (const file of files) {
          const sizeKB = (file.size / 1024).toFixed(1);
          const icon = file.type.startsWith('image/') ? '🖼️' : '📄';
          xtermRef.current.writeln(`\r\n  ${icon} ${file.name} (${sizeKB}KB)`);
        }
      }
      
      // Prepare form data for multimodal API
      const formData = new FormData();
      formData.append('message', 'Please analyze these files and provide insights:');
      formData.append('sessionId', sessionId || 'beta-terminal');
      
      // Add all files
      files.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });
      
      // Send to multimodal API
      if (xtermRef.current) {
        xtermRef.current.writeln(`\r\n\r\n🤖 Analyzing with Claude Vision...`);
      }
      
      const response = await fetch('/api/beta/multimodal', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Display AI response in terminal
        if (xtermRef.current) {
          xtermRef.current.writeln(`\r\n\r\n✨ AI Analysis:`);
          
          // Split response into lines and display
          const lines = result.content.split('\n');
          for (const line of lines) {
            xtermRef.current.writeln(`\r${line}`);
          }
          
          // Show token usage if available
          if (result.usage) {
            xtermRef.current.writeln(`\r\n\r\n📊 Tokens used: ${result.usage.input_tokens} input, ${result.usage.output_tokens} output`);
          }
        }
        
        // Update token counts if we have usage data
        if (result.usage) {
          setSessionTokens(prev => prev + (result.usage.input_tokens || 0) + (result.usage.output_tokens || 0));
          setTotalTokens(prev => prev + (result.usage.input_tokens || 0) + (result.usage.output_tokens || 0));
        }
      } else {
        // Show error
        if (xtermRef.current) {
          xtermRef.current.writeln(`\r\n❌ Error: ${result.error || 'Failed to process files'}`);
          if (result.details) {
            xtermRef.current.writeln(`\r   Details: ${result.details}`);
          }
        }
      }
      
    } catch (error) {
      console.error('Error processing files:', error);
      if (xtermRef.current) {
        xtermRef.current.writeln(`\r\n❌ Error processing files: ${error}`);
      }
    } finally {
      setIsProcessingFiles(false);
    }
  };
  
  const handleOpenNewSession = useCallback(() => {
    const cleanOutput = stripAnsiCodes(rawOutputRef.current).slice(-2000);
    const handoff = {
      context: cleanOutput,
      contextPercent: Math.round(contextPercent),
      sessionTokens,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem('coder1_session_handoff', JSON.stringify(handoff));
    } catch {
      // localStorage unavailable (private browsing / storage full) — open tab anyway
    }
    window.open('/ide-beta', '_blank');
  }, [contextPercent, sessionTokens]);

  const handleTextInsert = (text: string) => {
    // Insert text directly into terminal
    if (socketRef.current && sessionId) {
      socketRef.current.emit('terminal:input', {
        id: sessionId,
        data: text
      });
    }
  };

  return (
    <>
      {/* Global Drag Drop Overlay - Must be at root level */}
      <SimpleDragDropOverlay
        onFileDrop={handleFileDrop}
        onTextInsert={handleTextInsert}
        isProcessing={isProcessingFiles}
      />
      
      <div className="relative h-full bg-gray-900 rounded-lg overflow-hidden flex flex-col">
        {/* Terminal Header - Exact 40px height */}
      <div 
        className="flex items-center justify-between border-b border-border-default px-3 bg-bg-secondary border-t border-t-coder1-cyan/50 shadow-glow-cyan"
        style={{ height: spacing.terminalHeader.height }}
      >
        {/* Left section - Edit mode and settings */}
        <div className="flex items-center gap-2">
          {/* Voice-to-text button */}
          <button
            data-tour="voice-input-button"
            onClick={toggleVoice}
            disabled={!isMounted}
            className={`terminal-control-btn p-1.5 rounded-md ${voiceListening ? 'bg-red-600 bg-opacity-20' : ''} ${!isMounted ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={!isMounted ? 'Loading...' : voiceListening ? 'Stop voice input (LISTENING)' : 'Start voice-to-text'}
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
        <div 
          className="flex items-center gap-2"
          onClick={(e) => {
            console.log('🎯 BetaTerminal: Click detected on button container', e.target);
          }}
        >
          {/* Stop button */}
          <button
            onClick={() => {
              console.log('🛑 BetaTerminal: Stop button clicked');
              try {
                // Stop all running processes
                setAgentsRunning(false);
                setVoiceListening(false);
                // Supervision is managed by context, not local state
                
                // Stop speech recognition if active
                if (recognition && voiceListening) {
                  recognition.stop();
                }
                
                if (xtermRef.current) {
                  xtermRef.current.writeln(removeEmojis('\r\nEmergency Stop Activated:'));
                  xtermRef.current.writeln(removeEmojis('* All AI agents stopped'));
                  // xtermRef.current.writeln(removeEmojis('* Voice input disabled'));
                  xtermRef.current.writeln(removeEmojis('* Supervision disabled'));
                  xtermRef.current.writeln(removeEmojis('* Terminal processes killed'));
                  xtermRef.current.writeln(removeEmojis('\r\nSystem ready for new commands.'));
                } else {
                  console.warn('⚠️ BetaTerminal: xtermRef.current is null');
                }
              } catch (error) {
                console.error('❌ BetaTerminal: Error in Stop button handler:', error);
              }
            }}
            disabled={!isMounted}
            className={`terminal-stop-btn flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md ${!isMounted ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={!isMounted ? "Loading..." : "Emergency stop - halt all processes"}
          >
            <StopCircle className="w-4 h-4" />
            <span>Stop</span>
          </button>

          {/* Share Terminal toggle (Spectator Mode) */}
          {teamStore.syncTeam && (
            <button
              onClick={() => {
                const socket = socketRef.current;
                if (!socket) return;
                const spectator = useSpectatorStore.getState();
                if (spectator.isSharingTerminal) {
                  socket.emit('spectator:share:stop', { sessionId });
                  spectator.stopSharing();
                } else {
                  const user = useAuthStore.getState().user;
                  if (!user) return;
                  socket.emit('spectator:share:start', {
                    sessionId,
                    teamId: teamStore.syncTeam?.id,
                    userId: user.id,
                    username: user.username,
                  });
                  spectator.startSharing(sessionId!);
                }
              }}
              disabled={!isMounted || !sessionId}
              className={`terminal-control-btn flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md ${
                isSharingTerminal ? 'terminal-btn-active-orange' : ''
              } ${(!isMounted || !sessionId) ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isSharingTerminal ? `Sharing terminal (${spectatorCount} viewers)` : 'Share terminal with team'}
            >
              <Monitor className="w-4 h-4" />
              <span>{isSharingTerminal ? 'Sharing' : 'Share'}</span>
              {isSharingTerminal && spectatorCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] rounded-full font-medium">
                  {spectatorCount}
                </span>
              )}
            </button>
          )}

          {/* Platform Selector Dropdown */}
          <div className="relative" ref={platformDropdownRef}>
            <button
              onClick={() => {
                console.log('🎯 Platform Selector clicked');
                setShowPlatformSelector(!showPlatformSelector);
              }}
              disabled={!isMounted || availablePlatforms.length === 0}
              className={`terminal-control-btn flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md ${!isMounted ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!isMounted ? "Loading..." : `Switch AI Platform (${availablePlatforms.length} available)`}
            >
              <Grid className="w-4 h-4" />
              <span>LLMs</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showPlatformSelector ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Platform Dropdown Menu */}
            {showPlatformSelector && (
              <div 
                className="absolute top-full mt-2 right-0 bg-bg-secondary border border-border-default rounded-lg shadow-lg py-2 z-50 min-w-[250px]"
                style={{ boxShadow: glows.purple.medium }}
              >
                <div className="px-3 py-2 border-b border-border-default">
                  <div className="text-xs text-gray-400 uppercase tracking-wider">Available AI Platforms</div>
                </div>
                
                <div className="py-1">
                  {availablePlatforms.map((platform) => (
                    <button
                      key={platform.command}
                      onClick={() => {
                        console.log(`🔄 Switching to ${platform.name}`);
                        handlePlatformSwitch(platform.name);
                        setShowPlatformSelector(false);
                      }}
                      disabled={platformSwitching}
                      className={`w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-gray-800 transition-colors ${
                        activePlatform?.name === platform.name ? 'bg-gray-800/50' : ''
                      } ${platformSwitching ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="text-lg">{platform.icon}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{platform.name}</div>
                        <div className="text-xs text-gray-400">{platform.description}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {platform.authenticated ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <span className="text-xs text-orange-400">Not authenticated</span>
                        )}
                        {activePlatform?.name === platform.name && (
                          <span className="text-xs text-purple-400 font-medium">Active</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                
                {availablePlatforms.length === 0 && (
                  <div className="px-3 py-4 text-center text-gray-400 text-sm">
                    No AI platforms detected. Install Claude Code, OpenAI CLI, or GitHub Copilot CLI.
                  </div>
                )}
              </div>
            )}
          </div>


          {/* Memory button with dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                console.log('🧠 BetaTerminal: Memory button clicked, current state:', showMemoryDropdown);
                setShowMemoryDropdown(!showMemoryDropdown);
              }}
              disabled={!isMounted}
              className={`terminal-control-btn flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md ${!isMounted ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!isMounted ? "Loading..." : "Memory system status and controls"}
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
                  
                  {/* Context Statistics (moved from footer) */}
                  {console.log('🔍 BetaTerminal: Rendering memory dropdown, contextStats:', contextStats)}
                  
                  {/* Debug section - always show */}
                  <div className="border-t border-border-default pt-2 mt-2">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Context Memory (Debug)</div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">isActive:</span>
                      <span className="text-yellow-400 font-medium">{contextStats.isActive ? 'true' : 'false'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">isLoading:</span>
                      <span className="text-yellow-400 font-medium">{contextStats.isLoading ? 'true' : 'false'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Memories:</span>
                      <span className="text-purple-400 font-medium">{contextStats.totalMemories}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Contexts:</span>
                      <span className="text-purple-400 font-medium">{contextStats.totalSessions}</span>
                    </div>
                  </div>
                  
                  {contextStats.isActive && (
                    <>
                      <div className="border-t border-border-default pt-2 mt-2">
                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Context Memory</div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Memories:</span>
                          <span className="text-purple-400 font-medium">{contextStats.totalMemories}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Contexts:</span>
                          <span className="text-purple-400 font-medium">{contextStats.totalSessions}</span>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div className="border-t border-border-default pt-2 mt-2">
                    <button
                      onClick={() => {
                        memory.toggleMemory();
                        setMemoryEnabled(!memoryEnabled);
                      }}
                      className={`w-full px-3 py-1.5 rounded text-xs font-medium transition-colors
                        ${memory.isEnabled 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                    >
                      {memory.isEnabled ? 'Disable Memory' : 'Enable Memory'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>


          {/* AI Mastermind button */}
          <button
            className="terminal-control-btn flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md"
            title="AI Mastermind - Advanced planning and strategy"
          >
            <Code2 className="w-4 h-4" />
            <span>AI Mastermind</span>
          </button>

          {/* Enhanced Supervision button */}
          <button
            data-tour="supervision-button"
            onClick={() => {
              if (isSupervisionActive) {
                // If supervision is active, disable it
                toggleSupervision();
                xtermRef.current?.writeln(removeEmojis('\r\nAI Supervision Disabled'));
                xtermRef.current?.writeln(removeEmojis('Manual oversight mode restored.'));
              } else {
                // If not active, open configuration modal
                setConfigModalOpen(true);
                xtermRef.current?.writeln(removeEmojis('\r\nOpening AI Supervision Configuration...'));
                xtermRef.current?.writeln(removeEmojis('Program your custom supervision bot for this project.'));
              }
            }}
            className="terminal-control-btn flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md"
            title="AI monitors and guides your work"
          >
            {isSupervisionActive ? (
              <>
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className="text-yellow-400">Supervision</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                <span>Supervision</span>
              </>
            )}
          </button>

        </div>
      </div>

      {/* Terminal Content - BETA: Enhanced scrolling for Claude Code */}
      <div 
        ref={terminalContainerRef}
        className="flex-1 p-2 relative"
        style={{
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          ref={terminalRef}
          className="h-full w-full"
          onClick={handleTerminalClick}
        />
        {/* Spectator Mode overlay */}
        {isSpectating && spectatingSessionId && (
          <SpectatorTerminal
            sessionId={spectatingSessionId}
            sharerUsername={spectatingUsername || 'Unknown'}
            scrollback={spectatorScrollback}
            cols={spectatorDims.cols}
            rows={spectatorDims.rows}
            onExit={() => {
              socketRef.current?.emit('spectator:leave', { sessionId: spectatingSessionId });
              useSpectatorStore.getState().stopSpectating();
            }}
            socketRef={socketRef}
          />
        )}
      </div>

      {/* Context Window Bar */}
      {sessionTokens > 0 && (
        <div className="w-full h-1.5 bg-gray-700" title={`Context: ${Math.round(contextPercent)}% of 200K tokens used`}>
          <div
            className={`h-full transition-all duration-500 ${
              contextPercent >= 75 ? 'bg-red-500' :
              contextPercent >= 50 ? 'bg-yellow-400' :
              'bg-green-500'
            }`}
            style={{ width: `${contextPercent}%` }}
          />
        </div>
      )}

      {/* Context Warning — Yellow (50–74%) */}
      {contextPercent >= 50 && contextPercent < 75 && !yellowDismissed && (
        <div className="px-4 py-3 flex items-center justify-between bg-yellow-900/90 border-t border-yellow-700 text-yellow-100 text-sm font-medium">
          <div className="flex items-center gap-3">
            <span>🟡</span>
            <span>Context {Math.round(contextPercent)}% full — consider starting a fresh session to maintain quality.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              onClick={handleOpenNewSession}
              className="px-3 py-1 rounded text-xs font-semibold bg-yellow-500 hover:bg-yellow-400 text-gray-900"
            >
              Open New Session
            </button>
            <button
              onClick={() => setYellowDismissed(true)}
              aria-label="Dismiss context warning"
              className="opacity-60 hover:opacity-100 px-2 py-1 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Context Warning — Red (75%+) */}
      {contextPercent >= 75 && !redDismissed && (
        <div className="px-4 py-3 flex items-center justify-between bg-red-900/90 border-t border-red-700 text-red-100 text-sm font-medium">
          <div className="flex items-center gap-3">
            <span>🔴</span>
            <span>Context {Math.round(contextPercent)}% full — responses are degrading. Start a new session now.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              onClick={handleOpenNewSession}
              className="px-3 py-1 rounded text-xs font-semibold bg-red-500 hover:bg-red-400 text-white"
            >
              Open New Session
            </button>
            <button
              onClick={() => setRedDismissed(true)}
              aria-label="Dismiss context warning"
              className="opacity-60 hover:opacity-100 px-2 py-1 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="px-3 py-1 bg-gray-800 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <span>Session: {sessionTokens.toLocaleString()} tokens{sessionTokens > 0 ? ` (${Math.round(contextPercent)}%)` : ''}</span>
          <span>Total: {totalTokens} tokens</span>
          <span>Cost: {usageCost}</span>
        </div>
        
        <div className="flex items-center gap-4">
          {activePlatform && (
            <span className="flex items-center gap-1">
              {activePlatform.icon} {activePlatform.name}
            </span>
          )}
          <span>Platforms: {availablePlatforms.length}</span>
          <span className="text-orange-400">Beta Multi-AI</span>
        </div>
      </div>

      {/* Supervision Config Modal */}
      {isConfigModalOpen && (
        <SupervisionConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setConfigModalOpen(false)}
          onSave={saveConfiguration}
          templates={templates}
        />
      )}
    </div>
    </>
  );
}

export default BetaTerminal;