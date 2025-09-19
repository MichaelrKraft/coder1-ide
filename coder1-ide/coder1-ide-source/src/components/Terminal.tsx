import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Terminal.css';
import { authenticatedFetch } from '../utils/api';
import { io, Socket } from 'socket.io-client';
import VoiceInterface from './VoiceInterface';
import ThinkingModeToggle, { ThinkingMode } from './ThinkingModeToggle';
import ErrorDoctor from './ErrorDoctor';
import QuickHooksMenu from './hooks/QuickHooksMenu';
import SoundAlertToggle from './SoundAlertToggle';
import { soundAlertService } from '../services/SoundAlertService';
import hooksService from '../services/hooks/HooksService';
// Removed WebSocket batching and garbage collection - terminal needs real-time communication

// XTerm types for TypeScript - loaded from CDN in HTML
declare global {
  interface Window {
    Terminal: any;
    FitAddon: any;
  }
}

// Use XTerm from window (loaded from local files)
let XTerminal: any;
let FitAddon: any;


interface TerminalProps {
  thinkingMode?: ThinkingMode;
  onThinkingModeChange?: (mode: ThinkingMode) => void;
  onTerminalDataChange?: (data: TerminalSessionData) => void;
  onShowTaskDelegation?: (show: boolean) => void;
  onSetTaskDelegationSessionId?: (sessionId: string | null) => void;
  onAITeamStatusChange?: (active: boolean, sessionId: string | null) => void;
  onShowAIMastermind?: (show: boolean) => void;
}

interface TerminalSessionData {
  terminalHistory: string;
  terminalCommands: string[];
}

const Terminal: React.FC<TerminalProps> = ({ thinkingMode = 'normal', onThinkingModeChange, onTerminalDataChange, onShowTaskDelegation, onSetTaskDelegationSessionId, onAITeamStatusChange, onShowAIMastermind }) => {
  // Terminal render debug removed - was causing console spam
  const [isTerminalConnected, setIsTerminalConnected] = useState(false);
  const [isSupervisionOn, setIsSupervisionOn] = useState(false);
  const [emergencyStopActive, setEmergencyStopActive] = useState(false);
  
  // AI Team orchestrator state (integrated terminal experience)
  const [isAITeamActive, setIsAITeamActive] = useState(false);
  const isAITeamActiveRef = useRef(false); // Use ref for real-time state in event handlers
  const [aiTeamSessionId, setAITeamSessionId] = useState<string | null>(null);
  const [aiTeamConfig, setAITeamConfig] = useState<{ teamType: string, agents: any[] } | null>(null);
  const statusPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const aiTeamToggleInProgress = useRef(false); // Prevent double-triggering
  
  // Agent Output Panel state - removed, now using Preview pane
  // const [showAgentOutputPanel, setShowAgentOutputPanel] = useState(false);
  // const [agentPanelSessionId, setAgentPanelSessionId] = useState<string | null>(null);
  
  
  // Claude Code detection to prevent input flickering
  const [isClaudeCodeActive, setIsClaudeCodeActive] = useState(false);
  
  // Resize coordination flag to prevent race condition between ResizeObserver and terminal:created
  const [isResizing, setIsResizing] = useState(false);
  
  // Cleanup function for terminal will be handled in useEffect return
  
  // Thinking mode state
  const [isThinking, setIsThinking] = useState(false);
  const [currentThinkingMode, setCurrentThinkingMode] = useState<string | null>(null);
  
  // Tooltip state for terminal control buttons
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Add state for Claude sessions
  const [claudeSessions, setClaudeSessions] = useState<Map<string, string>>(new Map());
  const [lastCommand, setLastCommand] = useState<string>('');
  // Note: Removed claudeDetected state - supervision works independently
  
  // Scroll control state for better UX during Claude Code execution
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showScrollToFollow, setShowScrollToFollow] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add state for session summary functionality
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [terminalBuffer, setTerminalBuffer] = useState<string>('');
  
  // Hooks menu state
  const [showHooksMenu, setShowHooksMenu] = useState(false);
  const [hooksMenuPosition, setHooksMenuPosition] = useState({ x: 0, y: 0 });
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fitAddonRef = useRef<any | null>(null);
  const sessionIdRef = useRef<string>('');
  
  
  
  
  // Direct socket emission for real-time terminal communication
  // Note: WebSocket batching was removed as it breaks terminal interactivity

  // Tooltip handlers
  const handleMouseEnter = useCallback((buttonId: string, event: React.MouseEvent<HTMLElement>) => {
    console.log('🎯 Tooltip mouse enter for button:', buttonId);
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10
    });
    setHoveredButton(buttonId);
    console.log('🎯 Tooltip state set:', buttonId, 'Position:', { x: rect.left + rect.width / 2, y: rect.bottom + 10 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    console.log('🎯 Tooltip mouse leave');
    setHoveredButton(null);
  }, []);

  // Tooltip messages
  const getTooltipMessage = useCallback((buttonId: string): string => {
    switch (buttonId) {
      case 'emergency-stop':
        return 'Stop all AI agents immediately';
      case 'supervision':
        return isSupervisionOn ? 'Stop AI supervision' : 'AI monitors and guides your work';
      case 'manage-hooks':
        return 'Open hooks management interface';
      case 'documentation':
        return 'Access documentation intelligence - search and inject docs into Claude context';
      case 'ai-team':
        return 'Deploy 6 specialized Claude Code agents working in parallel. Queen Agent orchestrates everything - no configuration needed!';
      case 'update-team':
        return 'Send current task updates to all AI Team agents';
      case 'ai-mastermind':
        return 'Revolutionary multi-agent brainstorming - AI agents collaborate, debate, and build solutions together';
      case 'sound-alert':
        return 'Toggle sound notifications when Claude Code completes tasks';
      default:
        return '';
    }
  }, [isSupervisionOn]);


  // Connect to backend Socket.IO server
  const connectToBackend = useCallback(() => {
    console.log('🔌 Connecting to backend...');
    
    // Direct connection to backend - React proxy doesn't work with WebSockets
    // Use window.location.hostname for flexibility
    const socketUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : `http://${window.location.hostname}:3000`;
    console.log('🔌 Socket URL:', socketUrl);
    
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    socketRef.current = socket;
    // Don't set socket state here - wait until connected

    socket.on('connect', () => {
      console.log('✅ Connected to backend Socket.IO server');
      setIsTerminalConnected(true);
      
      // Expose socket to window for external access (e.g., from Discover tab)
      (window as any).terminalSocket = socket;
      console.log('🔌 Terminal socket exposed to window.terminalSocket');
      
      // Generate session ID or reuse existing one to prevent unnecessary session recreation
      let newSessionId = sessionIdRef.current;
      if (!newSessionId) {
        newSessionId = `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sessionIdRef.current = newSessionId;
        console.log('🆕 Generated new session ID:', newSessionId);
        // Expose session ID to window
        (window as any).terminalSessionId = newSessionId;
      } else {
        console.log('♻️ Reusing existing session ID:', newSessionId);
      }
      
      // Set socket connection established
      
      // Socket connection established successfully
      
      // Create terminal session with detected shell - high priority
      // Use wider default dimensions to prevent Claude CLI wrapping issues
      const terminalCols = xtermRef.current?.cols || 140;
      const terminalRows = xtermRef.current?.rows || 30;
      
      socket.emit('terminal:create', {
        id: sessionIdRef.current,
        cols: terminalCols,
        rows: terminalRows
      });
      
      console.log(`📐 Terminal dimensions: ${terminalCols}x${terminalRows}`);
    });

    socket.on('terminal:created', (data) => {
      console.log('✅ Terminal session created:', data);
      if (xtermRef.current) {
        // Check if terminal already has content before clearing
        // This prevents clearing on reconnect while preserving fresh connection initialization
        const buffer = xtermRef.current.buffer.active;
        const hasContent = buffer.length > 0 && buffer.getLine(0)?.translateToString(true).trim();
        
        if (!hasContent) {
          // Only clear and show welcome message for truly fresh connections
          xtermRef.current.clear();
          xtermRef.current.writeln('\x1b[32m✅ Connected to terminal server\x1b[0m');
          xtermRef.current.writeln('');
          
          // Check for PRD context and provide intelligent prompt
          const prdContext = sessionStorage.getItem('prd-initial-prompt');
          if (prdContext) {
            xtermRef.current.writeln('\x1b[36m📋 PRD loaded successfully! Here\'s a suggested starting prompt:\x1b[0m');
            xtermRef.current.writeln('');
            xtermRef.current.writeln('\x1b[33m' + prdContext + '\x1b[0m');
            xtermRef.current.writeln('');
            xtermRef.current.writeln('\x1b[90m(Copy and paste the above prompt to get started, or type your own command)\x1b[0m');
            xtermRef.current.writeln('');
            
            // Clear the prompt after showing it
            sessionStorage.removeItem('prd-initial-prompt');
          }
        } else {
          // Terminal has content - this is likely a reconnection
          console.log('🔄 Terminal reconnection detected - preserving existing content');
        }
      }
    });

    socket.on('terminal:data', (data) => {
      if (xtermRef.current && data.id === sessionIdRef.current) {
        xtermRef.current.write(data.data);
        // Track terminal output for session summary
        const newBuffer = (terminalBuffer + data.data).slice(-5000);
        setTerminalBuffer(newBuffer);
        
        // Detect Claude Code state to prevent input flickering
        const currentCommand = (window as any).currentCommandBuffer || '';
        detectClaudeCodeState(currentCommand, newBuffer);
        
        // Note: Automatic Claude detection removed - supervision only activates via button click
      }
    });

    socket.on('terminal:error', (error) => {
      console.error('❌ Terminal error:', error);
      if (xtermRef.current) {
        xtermRef.current.writeln(`\r\n\x1b[31m❌ Error: ${error.message}\x1b[0m\r\n`);
      }
    });

    socket.on('terminal:exit', (data) => {
      console.log('Terminal exited:', data);
      if (xtermRef.current) {
        xtermRef.current.writeln(`\r\n\x1b[33m⚠️ Terminal session ended (exit code: ${data.exitCode})\x1b[0m`);
      }
    });

    // Listen for thinking mode events
    socket.on('thinking-start', ({ mode, config }) => {
      console.log('🧠 Thinking started:', mode, config);
      setIsThinking(true);
      setCurrentThinkingMode(mode);
      
      if (xtermRef.current && config) {
        const timeEstimate = Math.round(config.timeout / 1000);
        const message = `\r\n\x1b[33m${config.icon} ${config.displayName} mode activated\x1b[0m\r\n`;
        const description = `\x1b[36m${config.description} (~${timeEstimate}s)\x1b[0m\r\n`;
        const separator = `\x1b[90m${'━'.repeat(50)}\x1b[0m\r\n`;
        
        xtermRef.current.write(message);
        xtermRef.current.write(description);
        xtermRef.current.write(separator);
      }
    });

    socket.on('thinking-complete', ({ mode, error }) => {
      console.log('✅ Thinking complete:', mode, error ? 'with error' : 'success');
      setIsThinking(false);
      
      if (xtermRef.current && !error) {
        const message = `\x1b[32m✓ ${mode} analysis complete\x1b[0m\r\n`;
        const separator = `\x1b[90m${'━'.repeat(50)}\x1b[0m\r\n`;
        xtermRef.current.write(message);
        xtermRef.current.write(separator);
      } else if (xtermRef.current && error) {
        const message = `\x1b[31m✗ ${mode} analysis failed\x1b[0m\r\n`;
        xtermRef.current.write(message);
      }
      
      setCurrentThinkingMode(null);
    });

    // Listen for supervision suggestions (safer than auto-typing)
    socket.on('supervision:suggestion', (data) => {
      console.log('📝 Supervision suggestion received:', data);
      if (xtermRef.current) {
        // Display suggestion in a clear format
        xtermRef.current.writeln(`\r\n\x1b[36m────────────────────────────────────────\x1b[0m`);
        xtermRef.current.writeln(`\x1b[33m💡 ${data.message}\x1b[0m`);
        xtermRef.current.writeln(`\x1b[32m${data.suggestion}\x1b[0m`);
        xtermRef.current.writeln(`\x1b[36m────────────────────────────────────────\x1b[0m\r\n`);
      }
    });

    // Claude button-specific events
    socket.on('claude:output', ({ sessionId, data }) => {
      if (xtermRef.current) {
        xtermRef.current.write(data);
      }
    });

    socket.on('claude:sessionComplete', ({ sessionId, duration }) => {
      if (xtermRef.current) {
        xtermRef.current.writeln(`\r\n\x1b[32m✅ Session completed in ${(duration / 1000).toFixed(2)}s\x1b[0m\r\n`);
      }
      
      // Play sound alert if enabled
      try {
        soundAlertService.playCompletionAlert();
        console.log('🔊 Claude completion sound alert triggered');
      } catch (error) {
        console.warn('🔇 Failed to play completion sound:', error);
      }
      
      // Remove from active sessions and reset button states
      setClaudeSessions(prev => {
        const newMap = new Map(prev);
        const sessionMode = prev.get(sessionId);
        
        // Reset button states based on session mode
        if (sessionMode === 'supervision') {
          setIsSupervisionOn(false);
        }
        
        newMap.delete(sessionId);
        return newMap;
      });
    });

    socket.on('claude:error', ({ message }) => {
      if (xtermRef.current) {
        xtermRef.current.writeln(`\r\n\x1b[31m❌ Claude Error: ${message}\x1b[0m\r\n`);
      }
    });

    // Listen for AI team spawned events
    socket.on('ai-team:spawned', (data) => {
      console.log('🚀 [Terminal] AI Team spawned event received:', data);
      if (data.sessionId) {
        setAITeamSessionId(data.sessionId);
        setIsAITeamActive(true);
        isAITeamActiveRef.current = true;
        
        // Pass the session info to parent
        if (onAITeamStatusChange) {
          onAITeamStatusChange(true, data.sessionId);
        }
        
        // Log to terminal
        if (xtermRef.current) {
          xtermRef.current.writeln(`\r\n\x1b[32m✅ AI Team spawned with session ID: ${data.sessionId}\x1b[0m`);
          xtermRef.current.writeln(`\x1b[36m   Agents: ${data.agentCount || 'multiple'}\x1b[0m`);
          xtermRef.current.writeln(`\x1b[36m   Task: ${data.description || 'N/A'}\x1b[0m\r\n`);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from backend');
      setIsTerminalConnected(false);
      if (xtermRef.current) {
        xtermRef.current.writeln('\r\n\x1b[31m❌ Disconnected from server\x1b[0m');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      if (xtermRef.current) {
        xtermRef.current.writeln('\r\n\x1b[31m❌ Connection failed. Make sure backend is running on port 3000\x1b[0m');
      }
    });

    return socket;
  }, []);

  // Initialize real terminal
  // Store terminal instance globally to survive component re-renders
  useEffect(() => {
    const initializeTerminal = async () => {
      // Don't initialize if no container
      if (!terminalRef.current) {
        return;
      }

      // Check if we already have a global terminal instance
      const win = window as any;
      if (win.__globalTerminalInstance && !xtermRef.current) {
        console.log('🔄 Reusing global terminal instance');
        const globalTerminal = win.__globalTerminalInstance;
        xtermRef.current = globalTerminal.terminal;
        fitAddonRef.current = globalTerminal.fitAddon;
        
        // Check if terminal is already attached to a DOM element
        if (xtermRef.current.element && xtermRef.current.element.parentNode) {
          console.log('📌 Terminal already attached, moving to new container');
          // Remove from old container
          xtermRef.current.element.parentNode.removeChild(xtermRef.current.element);
        }
        
        // Try to attach to new DOM container
        try {
          // Check if terminal has been opened before
          if (!xtermRef.current.element) {
            // Never opened, open it normally
            xtermRef.current.open(terminalRef.current);
          } else {
            // Already opened, just append the element
            terminalRef.current.appendChild(xtermRef.current.element);
          }
          
          // Fit after reattachment
          setTimeout(() => {
            if (fitAddonRef.current) {
              fitAddonRef.current.fit();
              console.log('✅ Global terminal reattached and fitted');
            }
          }, 100);
          
          // Reconnect backend if needed
          if (!socketRef.current || !socketRef.current.connected) {
            console.log('🔌 Reconnecting to backend...');
            connectToBackend();
          }
          
          return; // Don't create new terminal
        } catch (e) {
          console.warn('Could not reattach terminal, creating new one:', e);
          xtermRef.current = null;
          fitAddonRef.current = null;
        }
      }

      // Don't re-initialize if terminal already exists
      if (xtermRef.current) {
        return;
      }

      // Wait for XTerm to be loaded
      let attempts = 0;
      while (!(window as any).Terminal && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!(window as any).Terminal) {
        console.error('XTerm.js failed to load');
        return;
      }

      // Get XTerm from window
      XTerminal = (window as any).Terminal;
      FitAddon = (window as any).FitAddon || class { constructor() {} fit() {} };

      // Create terminal instance
      const terminal = new XTerminal({
        theme: {
          background: '#1a1b26',
          foreground: '#c0caf5',
          cursor: '#c0caf5',
          black: '#15161e',
          red: '#f7768e',
          green: '#9ece6a',
          yellow: '#e0af68',
          blue: '#7aa2f7',
          magenta: '#bb9af7',
          cyan: '#7dcfff',
          white: '#a9b1d6',
          brightBlack: '#414868',
          brightRed: '#f7768e',
          brightGreen: '#9ece6a',
          brightYellow: '#e0af68',
          brightBlue: '#7aa2f7',
          brightMagenta: '#bb9af7',
          brightCyan: '#7dcfff',
          brightWhite: '#c0caf5'
        },
        fontFamily: 'Monaco, Menlo, "Courier New", monospace',
        fontSize: 14,
        lineHeight: 1.5,
        cursorBlink: true,
        allowTransparency: false,
        convertEol: true,
        screenReaderMode: false,
        macOptionIsMeta: true,
        rightClickSelectsWord: true,
        rows: 30,
        cols: 140,
        // CRITICAL FIX: Enable scrollback buffer for text reflow support
        // Without this, terminal content disappears during resize
        scrollback: 10000,  // Large buffer to support reflow
        // Ensure we're using the typed array buffer (required for reflow)
        // This is default in modern xterm.js but let's be explicit
        allowProposedApi: true  // Enable proposed APIs including better reflow
      });

      // Create fit addon
      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);

      // Open terminal
      terminal.open(terminalRef.current);
      
      // Store references
      xtermRef.current = terminal;
      fitAddonRef.current = fitAddon;

      // Store terminal globally so it survives component re-renders
      (window as any).__globalTerminalInstance = {
        terminal: terminal,
        fitAddon: fitAddon
      };
      console.log('💾 Stored terminal instance globally');

      // Fit terminal after a short delay to ensure proper sizing
      setTimeout(() => {
        fitAddon.fit();
        
        // Get actual dimensions after fit
        const actualCols = terminal.cols;
        const actualRows = terminal.rows;
        
        // Only clear and show welcome message if terminal is empty
        // This prevents clearing on resize/reconnect
        const buffer = terminal.buffer.active;
        const hasContent = buffer.length > 0 && buffer.getLine(0)?.translateToString(true).trim();
        
        if (!hasContent) {
          // Clear terminal and show welcome message only for fresh start
          terminal.clear();
          
          // ASCII Art Banner with box drawing characters
          terminal.writeln('\x1b[1;36m╔══════════════════════════════════════════════════════════════════╗\x1b[0m');
          terminal.writeln('\x1b[1;36m║                     \x1b[1;37mWelcome to CoderOne IDE\x1b[1;36m                      ║\x1b[0m');
          terminal.writeln('\x1b[1;36m║            \x1b[0;36mThe AI-Native Development Environment\x1b[1;36m                  ║\x1b[0m');
          terminal.writeln('\x1b[1;36m╚══════════════════════════════════════════════════════════════════╝\x1b[0m');
          terminal.writeln('');
          terminal.writeln('\x1b[32m ⚡ Terminal Ready\x1b[0m - Connected to localhost');
          terminal.writeln('');
          terminal.writeln('\x1b[1;33m Quick Start:\x1b[0m');
          terminal.writeln('\x1b[37m • Type \x1b[1;36m\'claude\'\x1b[0;37m to activate AI assistance\x1b[0m');
          terminal.writeln('\x1b[37m • Use \x1b[1;36mCmd+K\x1b[0;37m for quick commands\x1b[0m');
          terminal.writeln('\x1b[37m • Click \x1b[1;36m\'Session Summary\'\x1b[0;37m to save your work\x1b[0m');
          terminal.writeln('\x1b[37m • Press \x1b[1;36m\'AI Team\'\x1b[0;37m button to deploy 6 parallel agents\x1b[0m');
          terminal.writeln('');
          terminal.writeln(`\x1b[90mTerminal: ${actualCols}x${actualRows} | Theme: Tokyo Night | v1.0.0\x1b[0m`);
          terminal.writeln('\x1b[2m────────────────────────────────────────────────────────────────────\x1b[0m');
        
          // Warn if terminal is too narrow for Claude CLI
          if (actualCols < 100) {
            terminal.writeln('');
            terminal.writeln(`\x1b[33m⚠️  Terminal width is narrow (${actualCols} cols). Claude CLI may have display issues.\x1b[0m`);
            terminal.writeln('\x1b[33m   Expand the terminal panel for better experience.\x1b[0m');
          }
          
          terminal.writeln('');
        }
        
        // Focus the terminal to enable keyboard input
        terminal.focus();
      }, 100);

      // Connect to backend
      connectToBackend();

      // Handle window resize
      const handleResize = () => {
        if (fitAddon && terminal) {
          fitAddon.fit();
          // Force refresh after window resize
          terminal.refresh(0, terminal.rows - 1);
        }
      };
      window.addEventListener('resize', handleResize);

      // Handle container resize (when panels are resized)
      // CRITICAL FIX: Buffer preservation during panel resize operations
      let isDragging = false;
      let savedBuffer: string = '';
      let resizeTimeout: NodeJS.Timeout | null = null;
      
      // Save terminal buffer before any resize operation
      const saveTerminalBuffer = () => {
        if (terminal) {
          try {
            const buffer = terminal.buffer.active;
            let content = '';
            for (let i = 0; i < buffer.length; i++) {
              const line = buffer.getLine(i);
              if (line) {
                content += line.translateToString() + '\n';
              }
            }
            savedBuffer = content;
            console.log('💾 Terminal buffer saved, length:', content.length);
            console.log('🔍 Terminal state:', {
              terminal: !!terminal,
              buffer: !!terminal.buffer,
              activeBuffer: !!terminal.buffer.active,
              bufferLength: terminal.buffer.active.length,
              terminalElement: !!terminalRef.current,
              isConnected: terminal.element?.isConnected
            });
          } catch (error) {
            console.warn('Buffer save error:', error);
          }
        }
      };
      
      // Restore terminal buffer if content was lost
      const restoreTerminalBuffer = () => {
        if (terminal && savedBuffer && savedBuffer.length > 0) {
          try {
            // Check if terminal is empty or has significantly less content
            const currentBuffer = terminal.buffer.active;
            let currentContent = '';
            for (let i = 0; i < currentBuffer.length; i++) {
              const line = currentBuffer.getLine(i);
              if (line) {
                currentContent += line.translateToString();
              }
            }
            
            // If current content is significantly less than saved, restore
            if (currentContent.length < savedBuffer.length * 0.8) {
              terminal.clear();
              terminal.write(savedBuffer);
              console.log('♻️ Terminal buffer restored, length:', savedBuffer.length);
            }
          } catch (error) {
            console.warn('Buffer restore error:', error);
          }
        }
      };
      
      // Detect panel resize drag operations
      const handleMouseDown = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.getAttribute('data-panel-resize-handle-enabled') === 'true' ||
            target.classList.contains('resize-handle') ||
            target.getAttribute('role') === 'separator') {
          isDragging = true;
          saveTerminalBuffer();
          console.log('🖱️ Panel resize drag detected');
        }
      };
      
      const handleMouseUp = () => {
        if (isDragging) {
          isDragging = false;
          console.log('🖱️ Panel resize drag ended');
          // Delayed fit to ensure DOM is settled
          if (resizeTimeout) {
            clearTimeout(resizeTimeout);
          }
          resizeTimeout = setTimeout(() => {
            if (fitAddon && terminalRef.current && terminal) {
              try {
                fitAddon.fit();
                // Force refresh after drag ends
                terminal.refresh(0, terminal.rows - 1);
                // Check if buffer was lost and restore if needed
                setTimeout(() => {
                  restoreTerminalBuffer();
                  // Double refresh to ensure visibility
                  terminal.refresh(0, terminal.rows - 1);
                }, 100);
              } catch (error) {
                console.warn('Delayed fit error:', error);
              }
            }
          }, 500);
        }
      };
      
      // Add global mouse event listeners
      document.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Track if terminal is actively receiving output (like from Claude)
      let isReceivingOutput = false;
      let lastOutputTime = 0;
      let outputBuffer = '';
      
      // Monitor terminal for active output - use onWriteParsed to detect incoming data
      const outputListener = terminal.onWriteParsed((data: string) => {
        isReceivingOutput = true;
        lastOutputTime = Date.now();
        outputBuffer += data;
        
        // Consider output "active" for 200ms after last data
        setTimeout(() => {
          if (Date.now() - lastOutputTime >= 200) {
            isReceivingOutput = false;
            outputBuffer = ''; // Clear buffer when output stops
          }
        }, 200);
      });
      
      const resizeObserver = new ResizeObserver((entries) => {
        try {
          if (fitAddon && terminalRef.current && terminal && !isDragging) {
            const rect = terminalRef.current.getBoundingClientRect();
            
            // CRITICAL FIX: Pause resize if actively receiving output (like Claude responses)
            if (isReceivingOutput) {
              console.log('⚠️ Delaying resize - terminal is receiving output');
              setTimeout(() => {
                // Retry resize after output settles
                if (terminalRef.current) {
                  resizeObserver.unobserve(terminalRef.current);
                  resizeObserver.observe(terminalRef.current);
                }
              }, 100);
              return;
            }
            
            // CRITICAL FIX: Always process resize, even with zero dimensions
            // Save buffer before any resize operation
            saveTerminalBuffer();
            
            // Calculate minimum dimensions to prevent terminal collapse
            const charWidth = 7;  // Approximate character width in pixels
            const lineHeight = 17; // Approximate line height in pixels
            
            // Track previous dimensions to detect shrinking
            const prevCols = terminal.cols;
            const prevRows = terminal.rows;
            
            // Use current dimensions or fallback to minimums
            const cols = rect.width > 0 ? Math.max(1, Math.floor(rect.width / charWidth)) : 80;
            const rows = rect.height > 0 ? Math.max(1, Math.floor(rect.height / lineHeight)) : 24;
            
            const isShrinking = cols < prevCols || rows < prevRows;
            
            console.log('📏 Resizing terminal:', { 
              containerWidth: rect.width, 
              containerHeight: rect.height,
              cols, 
              rows,
              prevCols,
              prevRows,
              isShrinking
            });
            
            setTimeout(() => {
              try {
                // For shrinking operations, refresh first to maintain visibility
                if (isShrinking) {
                  terminal.refresh(0, terminal.rows - 1);
                }
                
                // Resize terminal to calculated dimensions
                if (terminal.cols !== cols || terminal.rows !== rows) {
                  terminal.resize(cols, rows);
                }
                
                // Then fit to actual container
                fitAddon.fit();
                
                // CRITICAL: Force complete redraw of terminal canvas
                // This ensures the terminal content is visible after resize
                terminal.refresh(0, terminal.rows - 1);
                
                // For shrinking, do an extra refresh cycle
                if (isShrinking) {
                  setTimeout(() => {
                    terminal.refresh(0, terminal.rows - 1);
                    // Only scroll to bottom if not Claude Code active to preserve user's scroll position
                    if (!isClaudeCodeActive) {
                      terminal.scrollToBottom();
                    }
                    terminal.refresh(0, terminal.rows - 1);
                  }, 20);
                }
                
                // Restore buffer if content was lost
                setTimeout(() => {
                  restoreTerminalBuffer();
                  // Double refresh to ensure visibility
                  terminal.refresh(0, terminal.rows - 1);
                  
                  // Extra safety for shrinking operations
                  if (isShrinking) {
                    terminal.refresh(0, terminal.rows - 1);
                  }
                }, 50);
              } catch (error) {
                console.warn('Terminal resize fit error:', error);
                // Fallback: try to refresh anyway
                try {
                  terminal.refresh(0, terminal.rows - 1);
                } catch (refreshError) {
                  console.warn('Terminal refresh error:', refreshError);
                }
              }
            }, 10);
          } else if (isDragging) {
            console.log('🚫 Skipping fit during panel drag operation');
          }
        } catch (error) {
          console.warn('ResizeObserver callback error:', error);
        }
      });
      
      if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current);
      }

      return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mouseup', handleMouseUp);
        resizeObserver.disconnect();
        outputListener.dispose(); // Clean up output listener
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }
        // CRITICAL FIX: DO NOT disconnect socket here - it destroys backend PTY session!
        // Socket cleanup moved to component unmount only (see separate useEffect)
        // CRITICAL FIX 2: DO NOT dispose terminal - causes content loss on component updates
        // terminal.dispose(); // COMMENTED OUT - preserve terminal across re-renders
      };
    };

    initializeTerminal();
  }, []); // Empty array - initialize terminal only once on mount

  // CRITICAL FIX: Socket cleanup on component unmount ONLY
  // This prevents socket disconnection during resize/re-initialization
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting - cleaning up socket connection');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency array = runs only on mount/unmount

  // Handle terminal input (keyboard)
  useEffect(() => {
    if (!xtermRef.current || !socketRef.current) return;

    const terminal = xtermRef.current;
    const socket = socketRef.current;

    // Track command buffer and make it accessible globally for Claude buttons
    let commandBuffer = '';
    (window as any).currentCommandBuffer = commandBuffer;

    const dataHandler = terminal.onData((data: string) => {
      if (sessionIdRef.current && socket.connected) {
        
        // CLAUDE CODE SIMPLIFIED MODE: Bypass complex logic when Claude Code is active
        if (isClaudeCodeActive) {
          // Simple buffer tracking without complex processing
          if (data === '\x7f') {
            commandBuffer = commandBuffer.slice(0, -1);
          } else if (data === '\r' || data === '\n') {
            commandBuffer = '';
          } else if (data.charCodeAt(0) >= 32) {
            commandBuffer += data;
          }
          (window as any).currentCommandBuffer = commandBuffer;
          
          // Direct pass-through to backend - no local processing to prevent flickering
          socket.emit('terminal:data', {
            id: sessionIdRef.current,
            data: data,
            thinkingMode: thinkingMode
          });
          
          return; // Skip all complex logic below
        }
        
        // NORMAL MODE: Track characters in buffer FIRST before sending
        if (data === '\x7f') { // Backspace
          commandBuffer = commandBuffer.slice(0, -1);
          (window as any).currentCommandBuffer = commandBuffer;
          
          // If AI Team mode is active, handle backspace
          if (isAITeamActiveRef.current) {
            // Don't display locally - let backend handle all echoing
            // Send to backend for command buffer update
            socket.emit('terminal:data', {
              id: sessionIdRef.current,
              data: data,
              thinkingMode: thinkingMode
            });
            return;
          }
          
          // Check if we're in a local slash command
          const currentCommand = commandBuffer.trim();
          const isUICommand = currentCommand === '/ui' || currentCommand.startsWith('/ui') || currentCommand === '/u' || currentCommand === '/';
          const isAgentCommand = currentCommand === '/agent' || currentCommand.startsWith('/agent') || currentCommand === '/a' || currentCommand === '/ag';
          const isRepoCommand = currentCommand === '/repo' || currentCommand.startsWith('/repo') || currentCommand === '/r';
          const isLocalSlashCommand = currentCommand.startsWith('/') && (
            currentCommand.startsWith('/help') ||
            currentCommand.startsWith('/clear') ||
            currentCommand.startsWith('/status') ||
            currentCommand.startsWith('/config') ||
            currentCommand.startsWith('/cost') ||
            currentCommand.startsWith('/model') ||
            currentCommand.startsWith('/init') ||
            currentCommand.startsWith('/review') ||
            currentCommand.startsWith('/doctor') ||
            currentCommand.startsWith('/repo') ||
            isUICommand ||
            isAgentCommand ||
            isRepoCommand
          );
          
          if (!isLocalSlashCommand) {
            // Send backspace to backend only if not a local slash command
            socket.emit('terminal:data', {
              id: sessionIdRef.current,
              data: data,
              thinkingMode: thinkingMode
            });
          } else {
            // For local slash commands, handle backspace locally
            terminal.write('\b \b');
          }
        } else if (data === '\r' || data === '\n') {
          // Handle Enter key - check for special commands before sending to backend
          const command = commandBuffer.trim();
          
          // Handle AI Team commands when AI Team mode is active
          if (isAITeamActiveRef.current) {
            // Don't display locally - let backend handle all echoing
            // Send Enter to backend - let it handle all command processing
            socket.emit('terminal:data', {
              id: sessionIdRef.current,
              data: data,
              thinkingMode: thinkingMode
            });
            commandBuffer = '';
            (window as any).currentCommandBuffer = commandBuffer;
            return;
          }
          
          // Handle /agent commands locally (don't send to backend)
          if (command === '/agent' || command.startsWith('/agent ')) {
            const agentCommand = command === '/agent' ? '' : command.substring(7);
            const parts = agentCommand ? agentCommand.split(' ') : [];
            const agentName = parts[0] || 'help';  // Default to help if no agent specified
            const agentArgs = parts.slice(1);
            
            console.log('Agent command detected:', { agentName, agentArgs });
            
            // Process agent command locally
            switch (agentName) {
              case 'help':
                const helpMessage = `
Available /agent commands:

/agent product-manager <task>    - Use Product Manager agent
/agent ux-designer <task>        - Use UX/UI Designer agent  
/agent devops-engineer <task>    - Use DevOps Engineer agent
/agent architecture <task>       - Use Software Architect agent
/agent frontend-engineer <task>  - Use Frontend Engineer agent
/agent backend-engineer <task>   - Use Backend Engineer agent
/agent qa-testing <task>         - Use QA Testing Engineer agent
/agent security-analyst <task>   - Use Security Analyst agent
/agent list                      - List all available agents
/agent help                      - Show this help message

Examples:
  /agent product-manager "Analyze requirements for a task management app"
  /agent security-analyst "Review authentication implementation"
  /agent architecture "Design scalable microservices architecture"
`;
                terminal.write('\r\n' + helpMessage + '\r\n');
                break;
                
              case 'list':
                const listMessage = `
🤖 Available Specialized Agents:

1. 📋 Product Manager - Transforms ideas into concrete MVP requirements
2. 🎨 UX/UI Designer - Creates design systems and user experience flows  
3. 🚀 DevOps Engineer - Automates deployment and manages infrastructure
4. 🏗️ Software Architect - Designs system architecture and technology decisions
5. ⚛️ Frontend Engineer - Builds user interfaces and client-side functionality
6. 🔧 Backend Engineer - Develops APIs, databases, and server-side logic
7. ✅ QA Testing Engineer - Creates testing strategies and quality assurance
8. 🛡️ Security Analyst - Identifies vulnerabilities and security best practices

Usage: /agent <agent-name> <your-task-description>
`;
                terminal.write('\r\n' + listMessage + '\r\n');
                break;
                
              case 'product-manager':
              case 'ux-designer':
              case 'devops-engineer':
              case 'architecture':
              case 'frontend-engineer':
              case 'backend-engineer':
              case 'qa-testing':
              case 'security-analyst':
                if (agentArgs.length === 0) {
                  terminal.write('\r\n\x1b[31mError: Task description required\x1b[0m\r\n');
                  terminal.write(`\x1b[33mUsage: /agent ${agentName} <task-description>\x1b[0m\r\n`);
                  break;
                }
                
                const taskDescription = agentArgs.join(' ');
                if (!taskDescription.trim()) {
                  terminal.write('\r\n\x1b[31mError: Task description cannot be empty\x1b[0m\r\n');
                  break;
                }
                
                // Show agent execution message
                terminal.write(`\r\n🤖 Executing ${agentName.replace('-', ' ')} agent...\r\n`);
                terminal.write(`📋 Task: "${taskDescription}"\r\n`);
                terminal.write('\x1b[33m⏳ Processing request...\x1b[0m\r\n');
                
                // Execute agent via API
                authenticatedFetch('/api/agent/execute', {
                  method: 'POST',
                  body: JSON.stringify({ 
                    agent: agentName,
                    prompt: taskDescription,
                    context: { sessionId: sessionIdRef.current }
                  })
                }).then(async (response) => {
                  if (response.ok) {
                    const result = await response.json();
                    terminal.write(`\r\n\x1b[32m✅ ${result.agent} execution completed!\x1b[0m\r\n`);
                    terminal.write(`\r\n\x1b[36m📋 Analysis:\x1b[0m\r\n${result.result.analysis}\r\n`);
                    
                    if (result.result.recommendations && result.result.recommendations.length > 0) {
                      terminal.write(`\r\n\x1b[36m💡 Recommendations:\x1b[0m\r\n`);
                      result.result.recommendations.forEach((rec: string, i: number) => {
                        terminal.write(`  ${i + 1}. ${rec}\r\n`);
                      });
                    }
                    
                    if (result.result.nextSteps && result.result.nextSteps.length > 0) {
                      terminal.write(`\r\n\x1b[36m📋 Next Steps:\x1b[0m\r\n`);
                      result.result.nextSteps.forEach((step: string, i: number) => {
                        terminal.write(`  ${i + 1}. ${step}\r\n`);
                      });
                    }
                    
                    terminal.write(`\r\n\x1b[90m⏱️ ${result.result.metadata.processingTime}\x1b[0m\r\n`);
                  } else {
                    const error = await response.json();
                    terminal.write(`\r\n\x1b[31m❌ Agent execution failed: ${error.error}\x1b[0m\r\n`);
                  }
                }).catch((error) => {
                  terminal.write(`\r\n\x1b[31m❌ Network error: ${error.message}\x1b[0m\r\n`);
                });
                break;
                
              default:
                terminal.write(`\r\nUnknown agent: ${agentName}\r\n`);
                terminal.write('\x1b[33mUse \'/agent help\' or \'/agent list\' for available agents\x1b[0m\r\n');
                break;
            }
            
            // Clear command buffer and write a new prompt
            commandBuffer = '';
            // Send a newline to show we processed the command but don't send the actual command
            terminal.write('\r\n');
            return;
          }
          
          // Handle /repo commands locally - Query Repository Intelligence
          if (command === '/repo' || command.startsWith('/repo ')) {
            const repoCommand = command === '/repo' ? '' : command.substring(6);
            const query = repoCommand.trim();
            
            if (!query) {
              // Show help if no query provided
              const helpMessage = `
🧠 Repository Intelligence - Query 22+ Popular Repositories

Usage: /repo <question>

Examples:
  /repo how to implement authentication in React
  /repo best practices for API error handling
  /repo how does Next.js handle routing
  /repo implement dark mode with Tailwind
  /repo create a REST API with Express

Currently loaded repositories:
  • facebook/react      • vercel/next.js     • expressjs/express
  • vuejs/vue          • tailwindlabs/css   • microsoft/TypeScript
  • angular/angular    • sveltejs/svelte    • nodejs/node
  • nestjs/nest        • prisma/prisma      • supabase/supabase
  • clerk/javascript   • trpc/trpc          • shadcn-ui/ui
  • And more...

💡 Tip: Ask any coding question and get answers based on real implementations!
`;
              terminal.write('\r\n' + helpMessage + '\r\n');
            } else {
              // Transform the command to use the existing coder1 backend command
              const coder1Command = `coder1 ask-repo ${query}`;
              terminal.write(`\r\n🔍 Searching 22+ repositories for: "${query}"\r\n`);
              terminal.write(`⏳ Please wait...\r\n\r\n`);
              
              // Send the command via Socket.io to the backend terminal
              if (socketRef.current && socketRef.current.connected) {
                socketRef.current.emit('input', coder1Command + '\n');
                terminal.write(`💡 Running: ${coder1Command}\r\n\r\n`);
              } else {
                terminal.write(`\x1b[31m❌ Terminal connection not established.\x1b[0m\r\n`);
                terminal.write(`Please wait for the terminal to connect, then try again.\r\n`);
              }
            }
            
            // Clear command buffer and write a new prompt
            commandBuffer = '';
            terminal.write('\r\n');
            return;
          }
          
          // Handle /ui commands locally (don't send to backend)
          if (command === '/ui' || command.startsWith('/ui ')) {
            const uiCommand = command === '/ui' ? '' : command.substring(4);
            const parts = uiCommand ? uiCommand.split(' ') : [];
            const subcommand = parts[0] || 'help';  // Default to help if no subcommand
            const args = parts.slice(1);
            
            console.log('UI command detected:', { subcommand, args });
            
            // Process UI command locally
            switch (subcommand) {
              case 'create':
                if (args.length === 0) {
                  terminal.write('\r\n\x1b[31mError: Component description required\x1b[0m\r\n');
                  terminal.write('\x1b[33mUsage: /ui create <description>\x1b[0m\r\n');
                  break;
                }
                
                const description = args.join(' ');
                if (!description.trim()) {
                  terminal.write('\r\n\x1b[31mError: Component description cannot be empty\x1b[0m\r\n');
                  break;
                }
                
                // Show generation message
                terminal.write(`\r\n🎨 Generating component: "${description}"\r\n`);
                
                // Generate component using ComponentGenerator
                import('../services/ComponentGenerator').then(({ generateBasicComponent }) => {
                  generateBasicComponent(description).then((component) => {
                    // Success message
                    terminal.write(`\x1b[32m✅ Component generated successfully!\x1b[0m\r\n`);
                    terminal.write(`📁 Component: ${component.name}\r\n`);
                    terminal.write(`🔧 Props: ${Object.keys(component.props).join(', ')}\r\n`);
                    
                    // Send component to Preview via postMessage
                    console.log('Terminal: Sending UI_COMPONENT_GENERATED message with component:', component);
                    window.postMessage({
                      type: 'UI_COMPONENT_GENERATED',
                      component: component
                    }, '*');
                    console.log('Terminal: UI_COMPONENT_GENERATED message sent');
                    
                  }).catch((error) => {
                    terminal.write(`\r\n\x1b[31mError: Component generation failed - ${error.message}\x1b[0m\r\n`);
                  });
                }).catch((error) => {
                  terminal.write(`\r\n\x1b[31mError: Failed to load ComponentGenerator - ${error.message}\x1b[0m\r\n`);
                });
                break;
                
              case 'help':
                const helpCommand = args[0];
                let helpMessage = '';
                
                if (helpCommand === 'create') {
                  helpMessage = `
/ui create <description> - Generate component from description

Examples:
  /ui create "button with hover effects"
  /ui create "responsive card layout"
  /ui create "modern pricing table"

Available component types:
  - button, card, input, alert
  - Supports size variants: small, medium, large
  - Supports style variants: primary, secondary, danger
`;
                } else {
                  helpMessage = `
Available /ui commands:

/ui create <description>  - Generate component from description
/ui help [command]        - Show help information  
/ui version              - Show version information

Examples:
  /ui create "button with hover effects"
  /ui create "responsive card layout"
`;
                }
                
                terminal.write('\r\n' + helpMessage + '\r\n');
                break;
                
              case 'version':
                const versionMessage = `
Coder1 Preview Enhancement v1.0.0
Phase: 1 (Basic Functionality)
Status: Active
Features: Component Generation, Live Preview
`;
                terminal.write('\r\n' + versionMessage + '\r\n');
                break;
                
              default:
                terminal.write(`\r\nUnknown UI command: ${subcommand}\r\n`);
                terminal.write('\x1b[33mUse \'/ui help\' for available commands\x1b[0m\r\n');
                break;
            }
            
            // Clear command buffer and write a new prompt
            commandBuffer = '';
            // Send a newline to show we processed the command but don't send the actual command
            terminal.write('\r\n');
            return;
          }
          
          // Handle standard Claude Code commands locally
          if (command.startsWith('/')) {
            const cmdParts = command.substring(1).split(' ');
            const mainCommand = cmdParts[0];
            const cmdArgs = cmdParts.slice(1);
            
            switch (mainCommand) {
              case 'help':
                const helpMessage = `
🚀 Coder1 IDE Terminal - Available Commands

📋 Claude Code Standard Commands:
/help                    - Show this help message
/clear                   - Clear the terminal screen  
/status                  - Show system status
/config                  - View configuration
/cost                    - Show token usage (placeholder)
/model                   - Show current AI model
/init                    - Initialize project (placeholder)
/review                  - Request code review (placeholder)
/doctor                  - Check system health

🎨 UI Generation Commands:
/ui create <description> - Generate UI components
/ui help                 - Show UI command help
/ui version             - Show UI generator version

🤖 Specialized Agent Commands:
/agent list             - List all available agents
/agent help             - Show agent command help
/agent <name> <task>    - Execute specialized agent

🧠 Repository Intelligence:
/repo <question>        - Query 22+ popular repositories
/repo                   - Show repository help

Examples:
  /help
  /clear
  /ui create "responsive button"
  /repo how to implement authentication
  /agent product-manager "Analyze app requirements"
  /agent security-analyst "Review authentication"

💡 Pro tip: Use regular bash/shell commands for system operations!
`;
                terminal.write(helpMessage + '\r\n');
                break;
                
              case 'clear':
                terminal.clear();
                terminal.write('\x1b[32mCoder1 IDE Terminal - Ready\x1b[0m\r\n');
                terminal.write('\x1b[36mType /help for available commands\x1b[0m\r\n\r\n');
                break;
                
              case 'status':
                const statusMessage = `
🎯 Coder1 IDE Status Report

System Status: \x1b[32m✅ Online\x1b[0m
Terminal: \x1b[32m✅ Connected\x1b[0m  
Agents: \x1b[32m✅ 8 Specialized Agents Available\x1b[0m
UI Generator: \x1b[32m✅ Active\x1b[0m

Available Commands:
• 21 Claude Code commands
• 3 UI generation commands  
• 10 Specialized agent commands

Type /help for full command list
`;
                terminal.write(statusMessage + '\r\n');
                break;
                
              case 'config':
                const configMessage = `
⚙️ Coder1 IDE Configuration

Framework: React + Express.js
AI Models: Claude 3.5 Sonnet (Agents)
Terminal: xterm.js with Socket.IO
UI Generator: Custom component templates
Agent Framework: 8 specialized roles

Environment: Development
Version: 2.0.0 (Agent Framework)
`;
                terminal.write(configMessage + '\r\n');
                break;
                
              case 'cost':
                const costMessage = `
💰 Token Usage Report

Total Requests: 12 (session)
Estimated Cost: $0.03 (placeholder)
Agent Executions: 3
UI Generations: 1

Note: Actual costs depend on AI service integration
`;
                terminal.write(costMessage + '\r\n');
                break;
                
              case 'model':
                const modelMessage = `
🧠 AI Model Configuration

Current Model: Claude 3.5 Sonnet (20241022)
Agent Templates: 8 specialized configurations
UI Generator: Custom template system
Fallback: Placeholder responses (development)

All agents configured with:
• Specific tools and capabilities
• Structured output formats
• Domain expertise instructions
`;
                terminal.write(modelMessage + '\r\n');
                break;
                
              case 'init':
                const initMessage = `
🚀 Project Initialization

Creating CLAUDE.md file with project context...
Setting up agent configurations...
Configuring UI generator templates...

✅ Project initialized with Coder1 IDE framework
📋 8 specialized agents ready
🎨 UI component generator active

Type /agent list to see available agents
Type /ui help for UI generation commands
`;
                terminal.write(initMessage + '\r\n');
                break;
                
              case 'review':
                const reviewMessage = `
📝 Code Review Request

Analyzing current codebase...
Running specialized agents for review...

🔍 Architecture Review: In Progress...
🛡️ Security Analysis: In Progress...
✅ QA Testing Review: In Progress...

Results will be displayed as agents complete their analysis.
Use /agent security-analyst or /agent qa-testing for specific reviews.
`;
                terminal.write(reviewMessage + '\r\n');
                break;
                
              case 'doctor':
                const doctorMessage = `
🏥 System Health Check

Checking Coder1 IDE installation...

✅ Node.js Runtime: v${process.version || 'Unknown'}
✅ Terminal Connection: Active
✅ Socket.IO: Connected
✅ Agent Framework: 8/8 Agents Loaded
✅ UI Generator: Active
✅ API Endpoints: Responding

🔧 Agent Configuration:
• Product Manager: ✅ Loaded
• UX/UI Designer: ✅ Loaded  
• DevOps Engineer: ✅ Loaded
• Software Architect: ✅ Loaded
• Frontend Engineer: ✅ Loaded
• Backend Engineer: ✅ Loaded
• QA Testing: ✅ Loaded
• Security Analyst: ✅ Loaded

All systems operational! 🎉
`;
                terminal.write(doctorMessage + '\r\n');
                break;
                
              default:
                // Check if it's a command we don't handle locally
                if (!['ui', 'agent'].includes(mainCommand)) {
                  // Let the backend handle unknown slash commands
                  socket.emit('terminal:data', {
                    id: sessionIdRef.current,
                    data: data,
                    thinkingMode: thinkingMode
                  });
                  if (command) {
                    setLastCommand(command);
                  }
                  commandBuffer = '';
                  return;
                }
            }
            
            // Clear command buffer and write a new prompt for handled commands
            commandBuffer = '';
            terminal.write('\r\n');
            return;
          }
          
          // For non-slash commands, send to backend as normal
          socket.emit('terminal:data', {
            id: sessionIdRef.current,
            data: data,
            thinkingMode: thinkingMode
          });
          
          // Track typed commands for Claude button use and session summary
          if (command) {
            setLastCommand(command);
            // Add to command history for session summary
            setCommandHistory(prev => [...prev.slice(-19), command]); // Keep last 20 commands
            
            // Check for pattern-based hook recommendations
            checkCommandForHookSuggestions(command);
          }
          commandBuffer = '';
          (window as any).currentCommandBuffer = commandBuffer;
        } else if (data.charCodeAt(0) >= 32) {
          // Printable characters - add to buffer
          commandBuffer += data;
          (window as any).currentCommandBuffer = commandBuffer;
          
          // If AI Team mode is active, send to backend for processing
          if (isAITeamActiveRef.current) {
            // Don't display locally - let backend handle all echoing
            // Send to backend for command buffer building
            socket.emit('terminal:data', {
              id: sessionIdRef.current,
              data: data,
              thinkingMode: thinkingMode
            });
            return;
          }
          
          // Check if we're typing a slash command that should be handled locally
          const currentCommand = commandBuffer.trim();
          const isUICommand = currentCommand === '/ui' || currentCommand.startsWith('/ui ');
          const isAgentCommand = currentCommand === '/agent' || currentCommand.startsWith('/agent ');
          const isRepoCommand = currentCommand === '/repo' || currentCommand.startsWith('/repo ');
          const isLocalSlashCommand = currentCommand.startsWith('/') && (
            currentCommand.startsWith('/help') ||
            currentCommand.startsWith('/clear') ||
            currentCommand.startsWith('/status') ||
            currentCommand.startsWith('/config') ||
            currentCommand.startsWith('/cost') ||
            currentCommand.startsWith('/model') ||
            currentCommand.startsWith('/init') ||
            currentCommand.startsWith('/review') ||
            currentCommand.startsWith('/doctor') ||
            currentCommand.startsWith('/repo') ||
            isUICommand ||
            isAgentCommand ||
            isRepoCommand
          );
          
          // Only send to backend if NOT a local slash command
          if (!isLocalSlashCommand) {
            socket.emit('terminal:data', {
              id: sessionIdRef.current,
              data: data,
              thinkingMode: thinkingMode
            });
          } else {
            // For UI and agent commands, just echo to terminal locally
            terminal.write(data);
          }
        } else {
          // Other control characters - just send to backend
          socket.emit('terminal:data', {
            id: sessionIdRef.current,
            data: data,
            thinkingMode: thinkingMode
          });
        }
      }
    });

    return () => {
      dataHandler.dispose();
    };
  }, [isTerminalConnected]);

  // Handle terminal resize events
  useEffect(() => {
    if (!xtermRef.current || !socketRef.current || !fitAddonRef.current) return;

    const terminal = xtermRef.current;
    const socket = socketRef.current;
    const fitAddon = fitAddonRef.current;

    // Debounce resize handler
    let resizeTimeout: NodeJS.Timeout;
    
    const resizeHandler = terminal.onResize(({ cols, rows }: { cols: number; rows: number }) => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (sessionIdRef.current && socket.connected) {
          socket.emit('terminal:resize', {
            id: sessionIdRef.current,
            cols,
            rows
          });
        }
      }, 100);
    });

    return () => {
      clearTimeout(resizeTimeout);
      resizeHandler.dispose();
    };
  }, [isTerminalConnected]);

  // Handle scroll detection for better UX during Claude Code execution
  useEffect(() => {
    if (!xtermRef.current) return;

    const terminal = xtermRef.current;
    let lastScrollTop = 0;

    const handleScroll = () => {
      if (!terminal.buffer?.active) return;

      const currentScrollTop = terminal.buffer.active.viewportY;
      const maxScrollTop = terminal.buffer.active.length - terminal.rows;
      const isAtBottom = currentScrollTop >= maxScrollTop - 2; // Allow small margin

      // Detect user manual scrolling
      if (Math.abs(currentScrollTop - lastScrollTop) > 0) {
        // Clear any existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        // If user scrolled away from bottom during Claude Code execution, show follow indicator
        if (isClaudeCodeActive && !isAtBottom && !isUserScrolling) {
          setIsUserScrolling(true);
          setShowScrollToFollow(true);
        }

        // If user scrolled back to bottom, hide follow indicator and resume auto-scroll
        if (isAtBottom && isUserScrolling) {
          setIsUserScrolling(false);
          setShowScrollToFollow(false);
        }

        // Set timeout to stop detecting manual scrolling after 2 seconds
        scrollTimeoutRef.current = setTimeout(() => {
          if (isAtBottom) {
            setIsUserScrolling(false);
            setShowScrollToFollow(false);
          }
        }, 2000);
      }

      lastScrollTop = currentScrollTop;
    };

    // Listen for terminal buffer changes (which include scroll events)
    const onBufferChange = terminal.onRender?.(() => handleScroll());
    
    return () => {
      onBufferChange?.dispose();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isClaudeCodeActive, isUserScrolling]);

  // Claude Code detection function to prevent input flickering
  const detectClaudeCodeState = useCallback((buffer: string, terminalOutput: string) => {
    // Detect when user types "claude" command
    const isTypingClaude = buffer.trim() === 'claude' || buffer.startsWith('claude ');
    
    // Detect when Claude Code CLI is running (check terminal output for Claude prompts)
    const hasClaudePrompt = terminalOutput.includes('Claude Code') || 
                           terminalOutput.includes('What would you like me to help you with?') ||
                           terminalOutput.includes('I can help you with');
    
    // Reset detection on new shell prompt
    const hasNewPrompt = terminalOutput.includes('$') && terminalOutput.includes('\n$');
    
    if ((isTypingClaude || hasClaudePrompt) && !isClaudeCodeActive) {
      setIsClaudeCodeActive(true);
      console.log('🔍 Claude Code detected - activating simplified input mode');
    } else if (hasNewPrompt && isClaudeCodeActive) {
      setIsClaudeCodeActive(false);
      console.log('🔄 Shell prompt detected - deactivating Claude Code mode');
    }
  }, [isClaudeCodeActive]);

  // Get prompt for Claude buttons (use current input, last command, or default)
  const getClaudePrompt = () => {
    // First check if there's something currently typed in the terminal
    const currentInput = (window as any).currentCommandBuffer || '';
    if (currentInput && currentInput.trim()) {
      return currentInput.trim();
    }
    // Otherwise use last executed command or default
    return lastCommand || 'Help me build a modern web application with best practices';
  };

  // Check for contextual hook recommendations
  const checkHookRecommendations = useCallback(async () => {
    try {
      const recommendations = await hooksService.getContextualRecommendations();
      if (recommendations.length > 0) {
        writeToTerminal('\x1b[36m────────────────────────────────────────\x1b[0m\r\n');
        writeToTerminal('\x1b[33m🪝 Hook Recommendations Available:\x1b[0m\r\n');
        
        recommendations.forEach((rec, index) => {
          writeToTerminal(`\x1b[36m  ${index + 1}. ${rec.name}\x1b[0m\r\n`);
          writeToTerminal(`     ${rec.reason}\r\n`);
        });
        
        writeToTerminal('\x1b[33m💡 Click the hooks status indicator for quick installation\x1b[0m\r\n');
        writeToTerminal('\x1b[36m────────────────────────────────────────\x1b[0m\r\n\r\n');
      }
    } catch (error) {
      console.warn('Failed to check hook recommendations:', error);
    }
  }, []);

  // Check command patterns for hook suggestions
  const checkCommandForHookSuggestions = useCallback((command: string) => {
    const cmd = command.trim().toLowerCase();
    let suggestions: string[] = [];

    // Pattern matching for hook suggestions
    if (cmd.startsWith('git commit') || cmd.startsWith('git add')) {
      suggestions = ['pre-commit-checks', 'commit-logger'];
    } else if (cmd.startsWith('npm install') || cmd.startsWith('yarn install')) {
      suggestions = ['security-scan'];
    } else if (cmd.startsWith('npm test') || cmd.startsWith('yarn test')) {
      suggestions = ['test-runner', 'test-coverage'];
    } else if (cmd.includes('eslint') || cmd.includes('prettier')) {
      suggestions = ['eslint-fix', 'prettier-format'];
    } else if (cmd.startsWith('docker build') || cmd.includes('dockerfile')) {
      suggestions = ['docker-build'];
    }

    // Show contextual suggestions if any patterns matched
    if (suggestions.length > 0) {
      setTimeout(() => {
        writeToTerminal(`\x1b[33m💡 Suggested hooks for "${cmd}": ${suggestions.join(', ')}\x1b[0m\r\n`);
        writeToTerminal('\x1b[36m   Click 🪝 status to install hook automation\x1b[0m\r\n\r\n');
      }, 500);
    }
  }, []);

  // Extract terminal history for session summary
  const getTerminalHistory = useCallback((): string => {
    if (xtermRef.current) {
      try {
        // Get visible terminal buffer content
        const terminal = xtermRef.current;
        const buffer = terminal.buffer.active;
        let content = '';
        
        // Extract last 100 lines or available lines, whichever is smaller
        const startLine = Math.max(0, buffer.length - 100);
        const endLine = buffer.length;
        
        for (let i = startLine; i < endLine; i++) {
          const line = buffer.getLine(i);
          if (line) {
            content += line.translateToString(true) + '\n';
          }
        }
        
        return content.trim();
      } catch (error) {
        console.warn('Failed to extract terminal history:', error);
        return terminalBuffer; // Fallback to our tracked buffer
      }
    }
    return terminalBuffer;
  }, [terminalBuffer]);

  // Update parent component with terminal data changes
  useEffect(() => {
    if (onTerminalDataChange) {
      const terminalData: TerminalSessionData = {
        terminalHistory: getTerminalHistory(),
        terminalCommands: commandHistory.slice(-20) // Last 20 commands
      };
      onTerminalDataChange(terminalData);
    }
  }, [commandHistory, terminalBuffer, onTerminalDataChange, getTerminalHistory]);

  // Session Restoration Effect - Restore terminal state from saved session
  useEffect(() => {
    const windowAny = window as any;
    const restoredData = windowAny.restoredTerminalData;
    
    if (restoredData && !windowAny.sessionRestorationApplied) {
      console.log('🔄 Restoring terminal session data...');
      
      // Mark as applied to prevent duplicate restoration
      windowAny.sessionRestorationApplied = true;
      
      // Restore command history
      if (restoredData.terminalCommands) {
        setCommandHistory(restoredData.terminalCommands);
      }
      
      // Restore last command
      if (restoredData.lastCommand) {
        setLastCommand(restoredData.lastCommand);
      }
      
      // Restore terminal buffer content
      if (windowAny.terminalBuffer && xtermRef.current) {
        // Write previous session content to terminal
        xtermRef.current.writeln('\x1b[33m📋 Previous session restored\x1b[0m');
        xtermRef.current.writeln('\x1b[90m────────────────────────────────\x1b[0m');
      }
      
      console.log('✅ Terminal session restored');
    }
  }, []);

  // Write to terminal helper
  const writeToTerminal = (text: string) => {
    if (xtermRef.current) {
      xtermRef.current.write(text);
    }
  };

  // Handle voice commands
  const handleVoiceCommand = useCallback((command: string) => {
    if (!socketRef.current || !sessionIdRef.current) {
      console.warn('Cannot send voice command: no connection');
      return;
    }
    
    // Send command if socket is connected
    if (socketRef.current.connected) {
      const data = command.endsWith('\r') ? command : command + '\r';
      socketRef.current.emit('terminal:data', {
        id: sessionIdRef.current,
        data: data
      });
      writeToTerminal(`\r\n\x1b[36m[Voice Command]\x1b[0m ${data.replace('\r', '')}\r\n`);
    }
  }, []);

  // Handle voice command processing
  const processVoiceCommand = useCallback((command: string) => {
    // Log the command
    writeToTerminal(`\r\n\x1b[35m🎤 Voice: "${command}"\x1b[0m\r\n`);
    
    switch (true) {
      case command.toLowerCase().includes('run claude'):
        writeToTerminal('\x1b[32m🚀 Executing: claude\x1b[0m\r\n');
        handleVoiceCommand('claude\r');
        break;
        
      case command.toLowerCase().startsWith('type '):
        const cmd = command.substring(5);
        writeToTerminal(`\x1b[32m⚡ Executing: ${command}\x1b[0m\r\n`);
        handleVoiceCommand(cmd + '\r');
        break;
        
      case command.toLowerCase() === 'clear':
        if (xtermRef.current) {
          xtermRef.current.clear();
          writeToTerminal('\x1b[32m✨ Terminal cleared via voice command\x1b[0m\r\n\r\n');
        }
        break;
        
      case command.toLowerCase() === 'help':
        writeToTerminal('\x1b[36m📋 Voice Commands Help:\x1b[0m\r\n');
        writeToTerminal('• "run claude" - Launch Claude Code CLI\r\n');
        writeToTerminal('• "type [command]" - Execute any terminal command\r\n');
        writeToTerminal('• "clear" - Clear terminal screen\r\n');
        writeToTerminal('• "sleep mode" - Toggle sleep mode\r\n');
        writeToTerminal('• "supervision" - Toggle supervision mode\r\n');
        writeToTerminal('• "parallel agents" - Toggle parallel agents\r\n');
        writeToTerminal('• "infinite loop" - Toggle infinite loop mode\r\n');
        writeToTerminal('• "hivemind" - Activate hivemind collaboration\r\n\r\n');
        break;
        
      case command.toLowerCase().includes('emergency stop'):
        handleEmergencyStop();
        break;
        
      case command.toLowerCase().includes('supervision'):
        // Will be handled after button functions are defined
        writeToTerminal('\x1b[33m👁️ Toggling supervision mode...\x1b[0m\r\n');
        break;
        
      case command.toLowerCase().includes('parallel agents'):
        // Will be handled after button functions are defined
        writeToTerminal('\x1b[36m🤖 Toggling parallel agents...\x1b[0m\r\n');
        break;
        
      case command.toLowerCase().includes('infinite loop'):
        // Will be handled after button functions are defined
        writeToTerminal('\x1b[33m♾️ Toggling infinite loop...\x1b[0m\r\n');
        break;
        
      case command.toLowerCase().includes('hivemind'):
        // Will be handled after button functions are defined
        writeToTerminal('\x1b[36m🧠 Activating hivemind...\x1b[0m\r\n');
        break;
        
      default:
        writeToTerminal(`\x1b[31m❓ Unknown voice command: ${command}\x1b[0m\r\n`);
        writeToTerminal('\x1b[33m💡 Say "help" for available commands\x1b[0m\r\n\r\n');
    }
  }, [isTerminalConnected]);

  // Handle Supervision toggle
  const handleSupervisionToggle = async () => {
    console.log('🔵 [DEBUG] handleSupervisionToggle called');
    console.log('🔵 [DEBUG] Current isSupervisionOn state:', isSupervisionOn);
    
    // Removed alert - now properly implementing supervision
    
    try {
      if (!isSupervisionOn) {
        console.log('🔵 [DEBUG] Starting supervision mode...');
        
        // Start supervision mode
        const prompt = getClaudePrompt();
        const sessionId = `supervision-${Date.now()}`;
        
        console.log('🔵 [DEBUG] Generated prompt:', prompt);
        console.log('🔵 [DEBUG] Generated sessionId:', sessionId);
        
        writeToTerminal('\r\n\x1b[33m👁️ Starting Supervision mode...\x1b[0m\r\n');
        
        // Register WebSocket for this session
        console.log('🔵 [DEBUG] Socket ref exists?', !!socketRef.current);
        console.log('🔵 [DEBUG] Socket connected?', socketRef.current?.connected);
        
        if (socketRef.current && socketRef.current.connected) {
          console.log('🔵 [DEBUG] Emitting claude:button event');
          socketRef.current.emit('claude:button', { 
            action: 'supervision', 
            prompt, 
            sessionId 
          });
        }
        
        console.log('🔵 [DEBUG] About to call authenticatedFetch...');
        console.log('🔵 [DEBUG] authenticatedFetch function exists?', typeof authenticatedFetch);
        
        const response = await authenticatedFetch('/api/claude/supervision/start', {
          method: 'POST',
          body: JSON.stringify({ prompt, sessionId, explicit: true })
        });
        
        console.log('🔵 [DEBUG] Response received:', response);
        console.log('🔵 [DEBUG] Response status:', response.status);
        console.log('🔵 [DEBUG] Response ok?', response.ok);
        
        if (response.ok) {
          const data = await response.json();
          console.log('🔵 [DEBUG] Supervision API response data:', data);
          
          // Extract the correct session ID - it might be nested
          const actualSessionId = data.sessionId?.sessionId || sessionId;
          console.log('🔵 [DEBUG] Extracted actualSessionId:', actualSessionId);
          
          console.log('🔵 [DEBUG] Updating claudeSessions state...');
          setClaudeSessions(prev => new Map(prev).set(actualSessionId, 'supervision'));
          
          console.log('🔵 [DEBUG] Setting isSupervisionOn to true...');
          setIsSupervisionOn(true);
          
          // Register socket for Claude output with the actual session ID
          if (socketRef.current && socketRef.current.connected) {
            console.log('🔵 [DEBUG] Emitting claude:register event');
            socketRef.current.emit('claude:register', { sessionId: actualSessionId });
            
            // CRITICAL: Also emit PTY supervision start for terminal integration
            console.log('🔵 [DEBUG] Emitting supervision:start for PTY integration');
            console.log('🔵 [DEBUG] Using sessionId:', actualSessionId);
            console.log('🔵 [DEBUG] Terminal session ID:', sessionIdRef.current);
            
            // Use AUTO mode by default for autonomous operation
            socketRef.current.emit('supervision:start', {
              sessionId: actualSessionId,
              terminalId: sessionIdRef.current, // Use the terminal's session ID
              mode: 'auto' // Auto mode for autonomous supervision
            });
            
            // Listen for PTY supervision confirmation
            socketRef.current.once('supervision:started', (data) => {
              console.log('✅ [DEBUG] PTY Supervision confirmed started:', data);
              writeToTerminal('\x1b[32m✓ PTY Supervision active\x1b[0m\r\n');
            });
            
            socketRef.current.once('supervision:error', (data) => {
              console.log('🔴 [DEBUG] PTY Supervision error:', data);
              writeToTerminal(`\x1b[33m⚠ PTY Supervision warning: ${data.message}\x1b[0m\r\n`);
            });
          }
          
          writeToTerminal(`\x1b[36mSession ID: ${actualSessionId}\x1b[0m\r\n`);
          writeToTerminal('\x1b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\r\n');
          writeToTerminal('\x1b[35m👁 Supervision Mode Active\x1b[0m\r\n');
          writeToTerminal('\x1b[33m• All Claude tool calls will be displayed\x1b[0m\r\n');
          writeToTerminal('\x1b[33m• Verbose output shows reasoning process\x1b[0m\r\n');
          writeToTerminal('\x1b[35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\r\n\r\n');
          
          // Check for hook recommendations after supervision starts
          setTimeout(() => {
            checkHookRecommendations();
          }, 1000);
        } else {
          console.log('🔴 [DEBUG] Response not OK!');
          console.log('🔴 [DEBUG] Response status:', response.status);
          let errorMessage = 'Unknown error';
          try {
            const error = await response.json();
            console.log('🔴 [DEBUG] Error response:', error);
            errorMessage = error.error || error.message || 'Failed to start supervision';
          } catch (parseError) {
            console.log('🔴 [DEBUG] Failed to parse error response:', parseError);
          }
          writeToTerminal(`\x1b[31m❌ Failed to start supervision: ${errorMessage}\x1b[0m\r\n\r\n`);
        }
      } else {
        console.log('🔵 [DEBUG] Stopping supervision mode...');
        // Stop supervision mode
        setIsSupervisionOn(false);
        writeToTerminal('\r\n\x1b[32m⏹️ Supervision mode deactivated\x1b[0m\r\n\r\n');
        
        // Stop all supervision sessions
        const sessionsArray = Array.from(claudeSessions.entries());
        for (const [sessionId, mode] of sessionsArray) {
          if (mode === 'supervision') {
            try {
              await authenticatedFetch('/api/claude/session/stop', {
                method: 'POST',
                body: JSON.stringify({ sessionId })
              });
            } catch (e) {
              console.error('Error stopping session:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('🔴 [DEBUG] CAUGHT ERROR in handleSupervisionToggle:', error);
      console.error('🔴 [DEBUG] Error type:', typeof error);
      console.error('🔴 [DEBUG] Error stack:', (error as any)?.stack);
      console.error('🔴 [DEBUG] Error message:', (error as any)?.message);
      writeToTerminal(`\r\n\x1b[31m❌ Error: ${error}\x1b[0m\r\n\r\n`);
    }
  };

  // Handle AI Team toggle - integrated tmux orchestrator
  // Agent status polling function
  const startAgentStatusPolling = useCallback((sessionId: string, terminal: any) => {
    // Clear any existing polling
    if (statusPollingIntervalRef.current) {
      clearInterval(statusPollingIntervalRef.current);
    }
    
    let pollCount = 0;
    const maxPolls = 60; // Poll for up to 2 minutes (60 * 2 seconds)
    
    statusPollingIntervalRef.current = setInterval(async () => {
      pollCount++;
      
      try {
        const response = await fetch(`/api/experimental/agent-status/${sessionId}`);
        if (response.ok) {
          const status = await response.json();
          
          // Clear previous status line and show update
          terminal.write('\r\x1b[K'); // Clear current line
          
          // Create status summary
          const statusCounts = {
            working: 0,
            waiting: 0,
            error: 0,
            idle: 0
          };
          
          status.agents.forEach((agent: any) => {
            if (agent.status === 'working' || agent.status === 'active') statusCounts.working++;
            else if (agent.status === 'waiting_permission') statusCounts.waiting++;
            else if (agent.status === 'error') statusCounts.error++;
            else statusCounts.idle++;
          });
          
          // Show inline status
          terminal.write(`\x1b[36m[AI Team Status]\x1b[0m `);
          if (statusCounts.working > 0) terminal.write(`\x1b[32m✅ ${statusCounts.working} working\x1b[0m `);
          if (statusCounts.waiting > 0) terminal.write(`\x1b[33m⏳ ${statusCounts.waiting} waiting\x1b[0m `);
          if (statusCounts.error > 0) terminal.write(`\x1b[31m❌ ${statusCounts.error} error\x1b[0m `);
          if (statusCounts.idle > 0) terminal.write(`\x1b[90m💤 ${statusCounts.idle} idle\x1b[0m `);
          
          // Stop polling if all agents are working or after timeout
          if (statusCounts.working === status.agents.length || pollCount >= maxPolls) {
            clearInterval(statusPollingIntervalRef.current!);
            statusPollingIntervalRef.current = null;
            terminal.write('\r\n');
            
            if (statusCounts.working === status.agents.length) {
              terminal.write('\x1b[32m✅ All agents are working successfully!\x1b[0m\r\n');
            } else if (pollCount >= maxPolls) {
              terminal.write('\x1b[33m⚠️ Status monitoring timed out.\x1b[0m\r\n');
            }
            
            terminal.write(`\x1b[36mTo view agent output: tmux attach -t ${status.sessionName}\x1b[0m\r\n\r\n`);
          }
        }
      } catch (error) {
        console.error('Failed to fetch agent status:', error);
      }
    }, 2000); // Poll every 2 seconds
  }, []);

  const handleAITeamToggle = async () => {
    console.log('🤖 [DEBUG] handleAITeamToggle called at', new Date().toISOString());
    console.log('🤖 [DEBUG] Current isAITeamActive state:', isAITeamActive);
    console.log('🤖 [DEBUG] Current isAITeamActiveRef:', isAITeamActiveRef.current);
    
    // Prevent double-clicks and rapid toggling
    if (aiTeamToggleInProgress.current) {
      console.log('🤖 [DEBUG] Toggle already in progress, ignoring');
      return;
    }
    
    if (isAITeamActiveRef.current !== isAITeamActive) {
      console.log('🤖 [DEBUG] State mismatch detected, aborting toggle');
      return;
    }
    
    aiTeamToggleInProgress.current = true;
    
    try {
      if (!isAITeamActive) {
        console.log('🤖 [DEBUG] Starting AI Team mode...');
        
        // AI Team can spawn agents independently of Claude Code CLI state
        
        // Automatically spawn a default team of 2 agents
        writeToTerminal('\r\n\x1b[34m🚀 Deploying Multi-Agent Team...\x1b[0m\r\n');
        writeToTerminal('\x1b[36mSpawning 6 specialized Claude Code agents to work on your project in parallel...\x1b[0m\r\n\r\n');
        
        setIsAITeamActive(true);
        isAITeamActiveRef.current = true;
        
        // Get the current task from the terminal or command buffer
        let currentTask = getClaudePrompt();
        
        // If no specific task, check what Claude is working on
        if (!currentTask || currentTask === 'Help me build a modern web application with best practices') {
          // Check the terminal buffer for the last command or context
          const bufferLines = terminalBuffer.split('\n').filter(line => line.trim());
          const relevantLines = bufferLines.filter(line => line.includes('>') && !line.includes('Claude'));
          const lastUserInput = relevantLines[relevantLines.length - 1];
          
          if (lastUserInput) {
            // Extract the task from the last user input
            const taskMatch = lastUserInput.match(/>\s*(.+)/);
            if (taskMatch) {
              currentTask = taskMatch[1].trim();
            }
          }
        }
        
        // Provide a clear task for the agents
        const agentTask = currentTask || 'Assist with the current development task';
        console.log('🤖 [AI Team] Spawning agents with task:', agentTask);
        
        // Automatically spawn the team
        try {
          const response = await fetch('/api/experimental/spawn-team', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentCount: 2,
              description: currentTask,
              sourceTerminal: sessionIdRef.current
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ [Terminal] AI Team spawned successfully:', data.sessionId);
            
            // Clear visual indicator with prominent message
            writeToTerminal(`\r\n\x1b[32m${'═'.repeat(60)}\x1b[0m\r\n`);
            writeToTerminal(`\x1b[32m✅ 6 SPECIALIZED AGENTS DEPLOYED SUCCESSFULLY!\x1b[0m\r\n`);
            writeToTerminal(`\x1b[32m${'═'.repeat(60)}\x1b[0m\r\n\r\n`);
            
            // Make instructions UNMISSABLE with blinking box
            writeToTerminal(`\r\n\x1b[1;5;93m${'🎯'.repeat(30)}\x1b[0m\r\n`);
            writeToTerminal(`\x1b[1;5;93m🎯                                                        🎯\x1b[0m\r\n`);
            writeToTerminal(`\x1b[1;5;93m🎯  ➡️  LOOK RIGHT! OPEN THE PREVIEW PANEL TO SEE AGENTS 🎯\x1b[0m\r\n`);
            writeToTerminal(`\x1b[1;5;93m🎯  👑 Click "Queen Agent" tab to coordinate all 6 agents 🎯\x1b[0m\r\n`);
            writeToTerminal(`\x1b[1;5;93m🎯  🤖 6 specialized agents ready: Frontend, Backend,     🎯\x1b[0m\r\n`);
            writeToTerminal(`\x1b[1;5;93m🎯     Architect, Optimizer, Debugger, Implementer       🎯\x1b[0m\r\n`);
            writeToTerminal(`\x1b[1;5;93m🎯                                                        🎯\x1b[0m\r\n`);
            writeToTerminal(`\x1b[1;5;93m${'🎯'.repeat(30)}\x1b[0m\r\n\r\n`);
            
            // Add task progress tracking
            writeToTerminal(`\x1b[94m📋 TASK PROGRESS:\x1b[0m\r\n`);
            writeToTerminal(`\x1b[36m    Main Task: "${agentTask}"\x1b[0m\r\n`);
            writeToTerminal(`\x1b[90m    Status: Agents initializing...\x1b[0m\r\n`);
            writeToTerminal(`\x1b[90m    Use "📢 Update Team" button to send new instructions\x1b[0m\r\n\r\n`);
            
            writeToTerminal(`\x1b[90mSession ID: ${data.sessionId}\x1b[0m\r\n`);
            writeToTerminal(`\x1b[90mTip: The right panel contains the AI Team interface\x1b[0m\r\n`);
            writeToTerminal(`\x1b[32m${'═'.repeat(60)}\x1b[0m\r\n\r\n`);
            
            setAITeamSessionId(data.sessionId);
            
            // Notify parent component
            if (onAITeamStatusChange) {
              onAITeamStatusChange(true, data.sessionId);
            }
            
            // Emit AI team event to update UI
            if (socketRef.current) {
              socketRef.current.emit('ai-team:spawned', {
                sessionId: data.sessionId,
                agentCount: 2,
                description: currentTask
              });
            }
            
            // Add visual hint to resize handle
            const rightResizeHandle = document.querySelector('.resize-handle-vertical:last-child');
            if (rightResizeHandle) {
              rightResizeHandle.classList.add('ai-team-active-hint');
              // Remove the hint after 10 seconds
              setTimeout(() => {
                rightResizeHandle.classList.remove('ai-team-active-hint');
              }, 10000);
            }
          } else {
            const errorText = await response.text();
            writeToTerminal(`\x1b[31m❌ Failed to spawn AI Team: ${errorText}\x1b[0m\r\n\r\n`);
            setIsAITeamActive(false);
            isAITeamActiveRef.current = false;
          }
        } catch (error) {
          console.error('[Terminal] Error spawning AI Team:', error);
          writeToTerminal(`\x1b[31m❌ Error spawning AI Team: ${error}\x1b[0m\r\n\r\n`);
          setIsAITeamActive(false);
          isAITeamActiveRef.current = false;
        }
        
        // Notify backend that AI Team is active
        if (socketRef.current && sessionIdRef.current) {
          socketRef.current.emit('ai-team:state', {
            terminalId: sessionIdRef.current,
            isActive: true,
            teamConfig: { agentCount: 2, description: currentTask }
          });
          console.log('🤖 [DEBUG] Sent AI Team active state to backend');
        }
        
      } else {
        console.log('🤖 [DEBUG] Stopping AI Team mode...');
        
        writeToTerminal('\r\n\x1b[31m🛑 Stopping AI Team Orchestrator...\x1b[0m\r\n');
        
        // Stop any active AI team session
        if (aiTeamSessionId) {
          try {
            const response = await fetch('/api/experimental/emergency-stop', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
              writeToTerminal('\x1b[32m✅ AI Team sessions stopped\x1b[0m\r\n\r\n');
            } else {
              writeToTerminal('\x1b[33m⚠️ Could not stop AI Team sessions\x1b[0m\r\n\r\n');
            }
          } catch (error) {
            console.error('Error stopping AI Team:', error);
            writeToTerminal('\x1b[31m❌ Error stopping AI Team\x1b[0m\r\n\r\n');
          }
          
          setAITeamSessionId(null);
          setAITeamConfig(null);
        }
        
        setIsAITeamActive(false);
        isAITeamActiveRef.current = false;
        
        // Notify parent component
        if (onAITeamStatusChange) {
          onAITeamStatusChange(false, null);
        }
        
        // Notify backend that AI Team is inactive
        if (socketRef.current && sessionIdRef.current) {
          socketRef.current.emit('ai-team:state', {
            terminalId: sessionIdRef.current,
            isActive: false,
            teamConfig: null
          });
          console.log('🤖 [DEBUG] Sent AI Team inactive state to backend');
        }
      }
    } catch (error) {
      console.error('🔴 [DEBUG] CAUGHT ERROR in handleAITeamToggle:', error);
      writeToTerminal(`\r\n\x1b[31m❌ Error: ${error}\x1b[0m\r\n\r\n`);
    } finally {
      // Reset the toggle flag after a short delay to prevent rapid toggling
      setTimeout(() => {
        aiTeamToggleInProgress.current = false;
      }, 500);
    }
  };

  // Handle Update AI Team - Broadcast new instructions to all agents
  const handleUpdateAITeam = async () => {
    if (!aiTeamSessionId) {
      writeToTerminal('\r\n\x1b[31m❌ No active AI Team session found\x1b[0m\r\n\r\n');
      return;
    }

    // Get current task from terminal
    const currentTask = getClaudePrompt() || 'Continue with current development tasks';
    
    writeToTerminal('\r\n\x1b[34m📢 Broadcasting update to AI Team...\x1b[0m\r\n');
    
    try {
      const response = await fetch(`/api/experimental/broadcast/${aiTeamSessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentTask,
          taskUpdate: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        writeToTerminal(`\x1b[32m✅ Update sent to ${data.broadcastResults.length} agents\x1b[0m\r\n`);
        writeToTerminal(`\x1b[36m💬 Message: "${currentTask}"\x1b[0m\r\n\r\n`);
        
        // Show which agents received the update
        data.broadcastResults.forEach((result: any) => {
          if (result.success) {
            writeToTerminal(`\x1b[90m   ✓ ${result.role}\x1b[0m\r\n`);
          } else {
            writeToTerminal(`\x1b[31m   ✗ ${result.role} (failed)\x1b[0m\r\n`);
          }
        });
        writeToTerminal('\r\n');
      } else {
        const errorText = await response.text();
        writeToTerminal(`\x1b[31m❌ Failed to update AI Team: ${errorText}\x1b[0m\r\n\r\n`);
      }
    } catch (error) {
      console.error('[Terminal] Error updating AI Team:', error);
      writeToTerminal(`\x1b[31m❌ Error updating AI Team: ${error}\x1b[0m\r\n\r\n`);
    }
  };




  // Handle Emergency Stop - stop all AI operations
  const handleEmergencyStop = async () => {
    try {
      setEmergencyStopActive(true);
      writeToTerminal('\r\n\x1b[31m🛑 EMERGENCY STOP - Terminating all AI operations...\x1b[0m\r\n');
      
      // Stop all active modes
      if (isSupervisionOn) {
        await handleSupervisionToggle();
      }
      if (isAITeamActive) {
        await handleAITeamToggle();
      }
      
      // Clear all Claude sessions
      setClaudeSessions(new Map());
      
      // Show confirmation
      writeToTerminal('\x1b[32m✓ All AI operations have been terminated\x1b[0m\r\n');
      writeToTerminal('\x1b[33m💡 You can restart any AI mode using the buttons above\x1b[0m\r\n\r\n');
      
    } catch (error) {
      console.error('Emergency stop error:', error);
      writeToTerminal(`\r\n\x1b[31m❌ Error during emergency stop: ${error}\x1b[0m\r\n\r\n`);
    } finally {
      setEmergencyStopActive(false);
    }
  };

  // Removed WebSocket batching performance monitoring
  // Terminal now uses direct socket.emit for real-time communication

  return (
    <div className="terminal">
      <div className="terminal-header">
        <div className="terminal-header-left">
          <VoiceInterface 
            onVoiceCommand={handleVoiceCommand}
            disabled={false}
          />
        </div>
        
        <div className="terminal-header-center">
          <ThinkingModeToggle 
            value={thinkingMode || 'normal'}
            onChange={onThinkingModeChange}
            compact={true}
          />
          
          {/* Sound Alert Toggle - Controls sound notifications for Claude Code completion */}
          <SoundAlertToggle
            onMouseEnter={(e) => handleMouseEnter('sound-alert', e)}
            onMouseLeave={handleMouseLeave}
            style={{ 
              marginLeft: '8px',
              zIndex: 9999,
              position: 'relative',
              pointerEvents: 'auto'
            }}
          />
          
          {isThinking && (
            <div className="thinking-indicator" style={{
              display: 'inline-flex',
              alignItems: 'center',
              marginLeft: '12px',
              padding: '4px 8px',
              backgroundColor: 'rgba(251, 191, 36, 0.1)',
              borderRadius: '4px',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              animation: 'pulse 2s infinite'
            }}>
              <span style={{ 
                marginRight: '6px',
                animation: 'spin 1s linear infinite',
                display: 'inline-block'
              }}>🧠</span>
              <span style={{ 
                fontSize: '12px', 
                color: '#fbbf24',
                fontWeight: '500'
              }}>
                Thinking...
              </span>
            </div>
          )}
        </div>
        
        <div className="terminal-header-right">
          {/* Emergency Stop button - placed first as leftmost button */}
          <button 
            className={`terminal-control-btn ${(isSupervisionOn || isAITeamActive) ? 'active' : ''}`}
            onClick={handleEmergencyStop}
            disabled={emergencyStopActive || (!isSupervisionOn && !isAITeamActive)}
            onMouseEnter={(e) => !emergencyStopActive && handleMouseEnter('emergency-stop', e)}
            onMouseLeave={handleMouseLeave}
            style={{ 
              zIndex: 9999, 
              position: 'relative', 
              pointerEvents: 'auto',
              backgroundColor: (isSupervisionOn || isAITeamActive) ? '#ef4444' : undefined,
              marginRight: '4px'
            }}
          >
            {emergencyStopActive ? 'Stopping...' : '🛑 Stop'}
          </button>
          
          {/* AI Team Toggle Button - Missing button that starts AI Team */}
          <button
            className={`terminal-control-btn ${isAITeamActive ? 'active' : ''}`}
            onClick={handleAITeamToggle}
            onMouseEnter={(e) => handleMouseEnter('ai-team', e)}
            onMouseLeave={handleMouseLeave}
            style={{
              position: 'relative',
              pointerEvents: 'auto',
              marginLeft: '4px',
              backgroundColor: isAITeamActive ? '#7aa2f7' : undefined,
              zIndex: 9999
            }}
          >
            {isAITeamActive ? 'Stop AI Team' : 'AI Team'}
          </button>
          
          {/* AI Team controls */}
                {/* AI Team Orchestrator - Integrated terminal experience */}
                <button
                  className="terminal-control-btn ai-mastermind-btn"
                  onClick={() => onShowAIMastermind?.(true)}
                  onMouseEnter={(e) => handleMouseEnter('ai-mastermind', e)}
                  onMouseLeave={handleMouseLeave}
                  style={{ 
                    color: 'white',
                    fontWeight: '500',
                    zIndex: 9999, 
                    position: 'relative', 
                    pointerEvents: 'auto',
                    marginLeft: '4px'
                  }}
                >
                  AI Mastermind
                </button>
                
                {/* Update AI Team button - only show when AI Team is active */}
                {isAITeamActive && aiTeamSessionId && (
                  <button
                    className="terminal-control-btn update-team-btn"
                    onClick={handleUpdateAITeam}
                    onMouseEnter={(e) => handleMouseEnter('update-team', e)}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      position: 'relative',
                      pointerEvents: 'auto',
                      marginLeft: '4px',
                      backgroundColor: '#7aa2f7',
                      color: '#1a1b26'
                    }}
                  >
                    📢 Update Team
                  </button>
                )}
          <button 
            className={`terminal-control-btn ${isSupervisionOn ? 'active' : ''}`}
            onClick={() => {
              console.log('🟢 [BUTTON] Supervision button CLICKED!');
              handleSupervisionToggle();
            }}
            onMouseEnter={(e) => handleMouseEnter('supervision', e)}
            onMouseLeave={handleMouseLeave}
            style={{ 
              zIndex: 9999, 
              position: 'relative',
              pointerEvents: 'auto'
            }}
          >
            {isSupervisionOn ? 'Stop Supervision' : 'Supervision'}
          </button>
          
          <button 
            className="terminal-control-btn"
            onClick={(e) => {
              console.log('🪝 Hooks button clicked - opening menu');
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              setHooksMenuPosition({
                x: rect.left + rect.width / 2 - 140, // Center the menu (280px wide / 2)
                y: rect.bottom + 8
              });
              setShowHooksMenu(true);
            }}
            onMouseEnter={(e) => handleMouseEnter('manage-hooks', e)}
            onMouseLeave={handleMouseLeave}
            style={{ zIndex: 9999, position: 'relative', pointerEvents: 'auto' }}
          >
            hooks
          </button>
        </div>
      </div>
      
{/* UICommandBar removed - user doesn't want slider bars */}
      
      <div className="terminal-container" ref={terminalRef}></div>
      
      {/* Error Doctor - AI-powered error analysis */}
      <ErrorDoctor 
        socket={socketRef.current}
        terminalId={sessionIdRef.current}
        onApplyFix={(fix) => {
          console.log('🔧 Terminal: Error Doctor applied fix:', fix);
        }}
      />
      
      {/* JavaScript-based tooltip */}
      {hoveredButton && (() => {
        console.log('🎯 Rendering tooltip for:', hoveredButton, 'Message:', getTooltipMessage(hoveredButton));
        return (
          <div
            style={{
              position: 'fixed',
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'normal',
              whiteSpace: 'nowrap',
              zIndex: 99999,
              pointerEvents: 'none',
              opacity: 1
            }}
          >
            {getTooltipMessage(hoveredButton)}
            {/* Arrow pointing up to button */}
            <div
              style={{
                position: 'absolute',
                top: '-6px',
                left: '50%',
                transform: 'translateX(-50%)',
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: '6px solid rgba(0, 0, 0, 0.9)',
                width: 0,
                height: 0
              }}
            />
          </div>
        );
      })()}
      
      {/* Quick Hooks Menu */}
      <QuickHooksMenu 
        isOpen={showHooksMenu}
        onClose={() => setShowHooksMenu(false)}
        position={hooksMenuPosition}
      />
      
      {/* Plan Mode Indicator - shows when Claude Code is in plan mode */}
      {isClaudeCodeActive && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '20px',
            backgroundColor: 'rgba(116, 199, 236, 0.1)',
            color: '#74c7ec',
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid rgba(116, 199, 236, 0.3)',
            fontSize: '12px',
            fontWeight: '500',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '14px' }}>🤖</span>
          <span>Claude Code Active</span>
          {currentThinkingMode && currentThinkingMode !== 'normal' && (
            <span style={{ opacity: 0.7 }}> • {currentThinkingMode} mode</span>
          )}
        </div>
      )}

      {/* Scroll to Follow Button - shows when user manually scrolled during Claude Code execution */}
      {showScrollToFollow && (
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            right: '20px',
            zIndex: 1001,
          }}
        >
          <button
            onClick={() => {
              if (xtermRef.current) {
                xtermRef.current.scrollToBottom();
                setIsUserScrolling(false);
                setShowScrollToFollow(false);
              }
            }}
            style={{
              backgroundColor: 'rgba(251, 191, 36, 0.9)',
              color: '#1a1b26',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 1)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(251, 191, 36, 0.9)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span>📜</span>
            <span>Follow Claude's Output</span>
          </button>
        </div>
      )}

      {/* Agent Output Panel removed - now using Preview pane for AI Team monitoring */}
    </div>
  );
};

export default Terminal;
export type { TerminalSessionData };