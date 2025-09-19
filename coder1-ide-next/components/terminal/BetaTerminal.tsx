'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import './Terminal.css';
import { Users, Zap, StopCircle, Brain, Eye, Code2, Mic, MicOff, Speaker, ChevronDown, RefreshCw, Check, Grid } from '@/lib/icons';
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
import BetaTerminalDropOverlay from './BetaTerminalDropOverlay';

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
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdForVoiceRef = useRef<string | null>(null);
  const sessionCreatedRef = useRef(false);
  const onDataDisposableRef = useRef<any>(null);
  const connectionInProgressRef = useRef(false);
  const aiPlatformsInitializedRef = useRef(false);
  const socketRef = useRef<any>(null); // Socket reference like working Terminal
  
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [agentsRunning, setAgentsRunning] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [terminalReady, setTerminalReady] = useState(false);
  
  // Multi-AI Platform State
  const [availablePlatforms, setAvailablePlatforms] = useState<CLIInfo[]>([]);
  const [activePlatform, setActivePlatform] = useState<CLIInfo | null>(null);
  const [platformSwitching, setPlatformSwitching] = useState(false);
  const [showPlatformSelector, setShowPlatformSelector] = useState(false);
  const [aiSessionId, setAiSessionId] = useState<string | null>(null);
  
  // Claude command detection
  const [currentLineBuffer, setCurrentLineBuffer] = useState('');
  
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

  // Initialize AI platforms on mount
  useEffect(() => {
    console.log('🎯 BetaTerminal: Component mounted, initializing AI platforms');
    setIsMounted(true);
    
    // Force re-render after mount to ensure buttons are interactive
    const timer = setTimeout(() => {
      console.log('✅ BetaTerminal: Component fully mounted, buttons should be interactive');
    }, 100);
    
    return () => clearTimeout(timer);
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

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.open(terminalRef.current);
    
    setTimeout(() => {
      fitAddon.fit();
      // Force focus after opening (like working Terminal)
      term.focus();
    }, 0);

    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        setTimeout(() => {
          fitAddonRef.current?.fit();
        }, 10);
      }
    });

    resizeObserver.observe(terminalRef.current);

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
      resizeObserver.disconnect();
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

    // Add connection status listeners
    socket.on('connect', () => {
      console.log('🟢 Beta Terminal: Socket.IO CONNECTED to backend');
      // If reconnecting, re-establish terminal session
      if (isConnected && sessionId) {
        console.log('🔄 Beta Terminal: Reconnected - re-establishing terminal session');
        socket.emit('terminal:create', { id: sessionId });
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

    // Join the terminal session
    console.log('📡 Beta Terminal: Emitting terminal:create for session:', sessionId);
    socket.emit('terminal:create', { id: sessionId });

    // Handle terminal output from backend
    socket.on('terminal:data', ({ id, data }: { id: string; data: string }) => {
      if (id === sessionId && term) {
        term.write(data);
        
        // Check for AI command patterns
        if (data.includes('ai:') || data.includes('claude:') || data.includes('/parathink')) {
          const lines = data.split('\n');
          lines.forEach((line: string) => {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              if (trimmedLine.startsWith('/parathink')) {
                handleAICommand(trimmedLine);
              } else if (trimmedLine.includes('ai:') || trimmedLine.includes('claude:')) {
                handleAICommand(trimmedLine);
              }
            }
          });
        }
        
        // Store errors for ParaThinker context
        if (data.toLowerCase().includes('error') || data.includes('❌')) {
          localStorage.setItem('lastTerminalError', data.slice(-500));
        }
        
        // Capture terminal output
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
      }
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
        setCurrentLineBuffer('');
      } else if (data === '\u007f' || data === '\b') {
        setCurrentLineBuffer(prev => prev.slice(0, -1));
      } else if (data >= ' ' || data === '\t') {
        setCurrentLineBuffer(prev => {
          const newBuffer = prev + data;
          if (newBuffer.toLowerCase().includes('claude')) {
            if (!isSupervisionActive) {
              enableSupervision();
              console.log('👁️ Beta Terminal: Supervision auto-activated - claude detected');
            }
            if (onClaudeTyped) {
              onClaudeTyped();
            }
          }
          return newBuffer;
        });
      }
      
      if (onTerminalCommand) {
        onTerminalCommand(data);
      }
    });

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current && socket.connected) {
        fitAddonRef.current.fit();
        const { cols, rows } = xtermRef.current;
        socket.emit('terminal:resize', { id: sessionId, cols, rows });
      }
    };

    // Set up resize observer
    if (terminalRef.current && terminalRef.current.parentElement) {
      const resizeObserver = new ResizeObserver(() => {
        setTimeout(handleResize, 100);
      });
      resizeObserver.observe(terminalRef.current.parentElement);
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
      
      // Write the entire terminal string (contains ANSI escape sequences from Claude Code)
      // Note: removeEmojis might strip important ANSI codes, so we write raw data
      xtermRef.current.write(terminalData);
      
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
        xtermRef.current.write(terminalData);
        
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
                  xtermRef.current.writeln(removeEmojis('* Voice input disabled'));
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

          {/* AI Team Button */}
          <button
            onClick={handleSpawnAgents}
            disabled={!isMounted}
            className={`terminal-control-btn flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md ${!isMounted ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={!isMounted ? "Loading..." : "Deploy six Claude code agents working in parallel"}
          >
            <Users className="w-4 h-4" />
            <span>AI Team</span>
          </button>

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

      {/* Terminal Content */}
      <div className="flex-1 p-2 relative">
        <div 
          ref={terminalRef} 
          className="h-full" 
          onClick={handleTerminalClick}
        />
        
        {/* Multimodal Drop Overlay */}
        <BetaTerminalDropOverlay
          onFileDrop={handleFileDrop}
          onTextInsert={handleTextInsert}
          isProcessing={isProcessingFiles}
          terminalRef={terminalRef}
        />
      </div>

      {/* Status Bar */}
      <div className="px-3 py-1 bg-gray-800 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <span>Session: {sessionTokens} tokens</span>
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
  );
}

export default BetaTerminal;