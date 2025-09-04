'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import './Terminal.css';
import { Users, Zap, StopCircle, Brain, Eye, Code2, Mic, MicOff, Speaker, ChevronDown } from '@/lib/icons';
import TerminalSettings, { TerminalSettingsState } from './TerminalSettings';
import { glows, spacing } from '@/lib/design-tokens';
import { getSocket } from '@/lib/socket';
import ErrorDoctor from './ErrorDoctor';
import { soundAlertService, SoundPreset } from '@/lib/sound-alert-service';
import { useEnhancedSupervision } from '@/contexts/EnhancedSupervisionContext';
import SupervisionConfigModal from '@/components/supervision/SupervisionConfigModal';

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
export default function Terminal({ onAgentsSpawn, onClaudeTyped, onTerminalData, onTerminalCommand }: TerminalProps) {
  console.log('🖥️ Terminal component rendering...');
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdForVoiceRef = useRef<string | null>(null); // Move this up here
  const sessionCreatedRef = useRef(false); // Track if session was already created
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
        setTerminalSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.warn('Failed to parse terminal settings:', error);
      }
    }
  }, []);
  
  // Fetch token usage periodically when statusline is enabled
  useEffect(() => {
    if (!terminalSettings.statusLine?.enabled) return;
    
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
        console.warn('Failed to fetch Claude usage:', error);
      }
    };
    
    // Fetch immediately and then every 60 seconds (reduced from 30)
    fetchUsage();
    const interval = setInterval(fetchUsage, 60000);
    
    return () => clearInterval(interval);
  }, [terminalSettings.statusLine?.enabled]);
  
  // Fetch MCP server status periodically when statusline is enabled
  useEffect(() => {
    if (!terminalSettings.statusLine?.enabled) return;
    
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
        console.error('Failed to fetch MCP status:', error);
      }
    };
    
    // Fetch immediately and then every 60 seconds
    fetchMCPStatus();
    const interval = setInterval(fetchMCPStatus, 60000);
    
    return () => clearInterval(interval);
  }, [terminalSettings.statusLine?.enabled]);
  
  // Calculate block reset timer (resets every 3 hours)
  useEffect(() => {
    if (!terminalSettings.statusLine?.enabled) return;
    
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
  }, [terminalSettings.statusLine?.enabled]);

  // Save terminal settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('coder1-terminal-settings', JSON.stringify(terminalSettings));
  }, [terminalSettings]);
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
    // Prevent duplicate session creation
    if (sessionCreatedRef.current) {
      console.log('Session already created, skipping');
      return;
    }
    
    const createTerminalSession = async () => {
      sessionCreatedRef.current = true;
      console.log('🚀 CREATING TERMINAL SESSION...');
      
      try {
        // Create a real terminal session via the backend
        console.log('📡 Calling /api/terminal-rest/sessions...');
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
        
        console.log('📡 Session response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📡 Session response data:', data);
          setSessionId(data.sessionId);
          // Immediately update the ref for voice recognition
          sessionIdForVoiceRef.current = data.sessionId;
          setTerminalReady(true);
          console.log('✅ Terminal session created:', data.sessionId);
        } else {
          console.error('Failed to create terminal session:', response.status);
          // Fallback to simulated mode
          const simulatedId = 'simulated-' + Date.now();
          setSessionId(simulatedId);
          sessionIdForVoiceRef.current = simulatedId;
          setTerminalReady(true);
        }
      } catch (error) {
        console.error('Error creating terminal session:', error);
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
  
  // Store whether component is mounted
  const isMountedRef = useRef(true);
  
  // Cleanup session only on actual unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      // Only cleanup the current session on unmount
      const currentSessionId = sessionIdForVoiceRef.current || sessionId;
      if (currentSessionId && !currentSessionId.startsWith('simulated-')) {
        console.log('🧹 Cleaning up terminal session on unmount:', currentSessionId);
        fetch(`/api/terminal-rest/sessions/${currentSessionId}`, {
          method: 'DELETE'
        }).catch(err => {
          console.log('Session cleanup (expected on unmount):', err.message);
        });
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  useEffect(() => {
    console.log('🖥️ INITIALIZING XTERM...');
    if (!terminalRef.current) {
      console.log('❌ Terminal ref not ready');
      return;
    }

    try {
      console.log('🔧 Creating XTerm instance...');
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
      
      // Ensure the container is ready before opening
      if (terminalRef.current && terminalRef.current.offsetParent !== null) {
        term.open(terminalRef.current);
        
        // Wait a bit before fitting to ensure DOM is ready
        setTimeout(() => {
          try {
            fitAddon.fit();
            term.focus();
            
            // Add custom welcome message
            term.clear();
            term.writeln('Coder1 Terminal Ready');
            term.writeln("Type 'claude' to start AI-assisted coding");
            term.writeln('──────────────────────────────────────────────');
            term.writeln('');
            
            // Don't show initial prompt - backend will provide it
            // Connect to backend immediately
            if (sessionId && terminalReady) {
              connectToBackend(term);
            }
          } catch (error) {
            console.log('FitAddon error (non-critical):', error);
          }
        }, 100);
        
        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

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
                console.log('🔍 SCROLL STATE CHANGE:', debugInfo);
              }
              
              // Clear existing debounce timer
              if (scrollDebounceRef.current) {
                clearTimeout(scrollDebounceRef.current);
              }
              
              // Debounce the state update by 50ms (reduced for more responsiveness)
              scrollDebounceRef.current = setTimeout(() => {
                if (!isAtBottom && !isUserScrolled) {
                  console.log('👆 USER SCROLLED UP:', debugInfo);
                  setIsUserScrolled(true);
                } else if (isAtBottom && isUserScrolled) {
                  console.log('👇 USER RETURNED TO BOTTOM:', debugInfo);
                  setIsUserScrolled(false);
                }
                
                // AUTO-SCROLL LOGIC: If user is at bottom and there's new content, keep following
                if (isAtBottom && hasNewContent && !isUserScrolled) {
                  console.log('🚀 AUTO-SCROLL TRIGGERED:', debugInfo);
                  // Use multiple scroll methods to ensure it works
                  try {
                    term.scrollToBottom();
                    // Fallback: Force viewport to match baseY if scrollToBottom fails
                    if (term.buffer && term.buffer.active && buffer.viewportY !== buffer.baseY) {
                      console.log('🔧 FORCING VIEWPORT SYNC:', { from: buffer.viewportY, to: buffer.baseY });
                      term.scrollLines(buffer.baseY - buffer.viewportY);
                    }
                  } catch (scrollError) {
                    console.error('❌ SCROLL ERROR:', scrollError);
                  }
                }
              }, 50);
            } catch (e) {
              console.error('❌ SCROLL CHECK ERROR:', e);
            }
          }
        };
        
        // 🔍 DIAGNOSTIC: Log timer setup
        console.log('⏰ SETTING UP SCROLL INTERVAL:', { sessionId, interval: '150ms' });
        scrollCheckIntervalRef.current = setInterval(checkScrollPosition, 150); // Increased frequency for better responsiveness

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
          if (fitAddonRef.current && term) {
            try {
              // 🔍 DIAGNOSTIC: Log resize events and terminal state before/after
              const beforeBuffer = term.buffer?.active;
              const beforeState = beforeBuffer ? {
                viewportY: beforeBuffer.viewportY,
                baseY: beforeBuffer.baseY,
                isAtBottom: beforeBuffer.viewportY === beforeBuffer.baseY
              } : null;
              
              console.log('🔄 RESIZE EVENT TRIGGERED:', {
                timestamp: Date.now(),
                beforeState,
                sessionId
              });

              setTimeout(() => {
                fitAddonRef.current?.fit();
                
                // Check state after resize
                const afterBuffer = term.buffer?.active;
                const afterState = afterBuffer ? {
                  viewportY: afterBuffer.viewportY,
                  baseY: afterBuffer.baseY,
                  isAtBottom: afterBuffer.viewportY === afterBuffer.baseY
                } : null;
                
                console.log('📐 RESIZE COMPLETED:', {
                  timestamp: Date.now(),
                  beforeState,
                  afterState,
                  stateChanged: JSON.stringify(beforeState) !== JSON.stringify(afterState)
                });
                
                // If resize broke the viewport sync, fix it immediately
                if (afterBuffer && afterBuffer.viewportY !== afterBuffer.baseY) {
                  console.log('🚨 RESIZE BROKE VIEWPORT SYNC - FIXING:', {
                    viewportY: afterBuffer.viewportY,
                    baseY: afterBuffer.baseY,
                    scrollLines: afterBuffer.baseY - afterBuffer.viewportY
                  });
                  term.scrollLines(afterBuffer.baseY - afterBuffer.viewportY);
                }
                
                // Additional fix: If resize caused container to jump to top but content fits
                // Force the terminal to stay at bottom by scrolling the container
                const terminalContainer = terminalRef.current?.parentElement;
                if (terminalContainer) {
                  const isContainerAtTop = terminalContainer.scrollTop === 0;
                  const hasContent = afterBuffer && afterBuffer.baseY > 0;
                  
                  if (isContainerAtTop && hasContent) {
                    console.log('🚨 RESIZE CAUSED CONTAINER TOP JUMP - FIXING:', {
                      containerScrollTop: terminalContainer.scrollTop,
                      containerScrollHeight: terminalContainer.scrollHeight,
                      containerClientHeight: terminalContainer.clientHeight,
                      baseY: afterBuffer.baseY
                    });
                    
                    // Force container to bottom
                    terminalContainer.scrollTop = terminalContainer.scrollHeight;
                    
                    // Also ensure xterm is at bottom
                    term.scrollToBottom();
                  }
                }
              }, 10);
            } catch (error) {
              console.error('❌ RESIZE ERROR:', error);
            }
          }
        });

        if (terminalRef.current && terminalRef.current.parentElement) {
          resizeObserver.observe(terminalRef.current.parentElement);
        }

        // Return cleanup function
        const cleanup = () => {
          try {
            console.log('🧹 CLEANING UP TERMINAL:', { sessionId });
            resizeObserver.disconnect();
            // Clean up scroll monitoring
            if (scrollCheckIntervalRef.current) {
              console.log('⏰ CLEARING SCROLL INTERVAL');
              clearInterval(scrollCheckIntervalRef.current);
              scrollCheckIntervalRef.current = null;
            }
            // Phase 4: Clean up debounce timer
            if (scrollDebounceRef.current) {
              console.log('⏰ CLEARING DEBOUNCE TIMER');
              clearTimeout(scrollDebounceRef.current);
              scrollDebounceRef.current = null;
            }
            if (term) {
              console.log('🗑️ DISPOSING TERMINAL');
              term.dispose();
            }
          } catch (error) {
            console.error('❌ CLEANUP ERROR:', error);
          }
        };

        return cleanup;
        
      } else {
        console.log('Terminal container not ready, retrying...');
        // Retry after a short delay if container isn't ready
        setTimeout(() => {
          if (terminalRef.current) {
            term.open(terminalRef.current);
            fitAddon.fit();
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
    console.log('📝 Updated sessionIdForVoiceRef:', sessionId);
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
        
        // Show interim results as user speaks
        if (interimTranscript && xtermRef.current) {
          console.log('Interim transcript:', interimTranscript);
          // Show interim feedback inline
          xtermRef.current.write(`\r\n💬 Hearing: "${interimTranscript}"`);
        }
        
        if (finalTranscript && finalTranscript.trim()) {
          // Clean up the transcript
          const cleanTranscript = finalTranscript.trim();
          console.log('Final speech recognized:', cleanTranscript);
          
          // Clear interim feedback and show final
          if (xtermRef.current) {
            xtermRef.current.writeln(`\r\n✅ Recognized: "${cleanTranscript}"`);
            
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
            
            // Write the text to the terminal UI for immediate feedback
            xtermRef.current.write(cleanTranscript);
            
            // Get the socket from the global socket service
            const socket = getSocket();
            const currentSessionId = sessionIdForVoiceRef.current;
            
            console.log('🎤 Voice input debug:', {
              sessionIdFromRef: currentSessionId,
              sessionIdFromState: sessionId,
              socketConnected: socket?.connected,
              transcript: cleanTranscript
            });
            
            // Send to backend if we have a valid session
            if (socket && socket.connected && currentSessionId && !currentSessionId.startsWith('simulated-')) {
              console.log('✅ Sending voice input to real session:', currentSessionId);
              
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
              console.warn('Cannot send voice input to backend:', {
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
        console.error('Speech recognition error:', event.error);
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
            console.log('Auto-restart failed:', error);
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
      console.warn('Speech recognition not supported in this browser');
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
        console.error('Failed to start speech recognition:', error);
        setVoiceListening(false);
        xtermRef.current?.writeln('\r\n❌ Failed to start voice input');
        xtermRef.current?.writeln(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const connectToBackend = (term: XTerm) => {
    console.log('🔌 CONNECTING TO BACKEND:', { sessionId, terminalReady });
    if (!sessionId || !terminalReady) {
      console.log('❌ Session not ready yet:', { sessionId, terminalReady });
      return;
    }

    // Get Socket.IO instance to connect to Express backend
    console.log('🔧 Getting Socket.IO instance...');
    const socket = getSocket();
    console.log('✅ Socket.IO instance obtained:', socket.connected ? 'CONNECTED' : 'DISCONNECTED');
    socketRef.current = socket;

    // Add connection status listeners for debugging
    socket.on('connect', () => {
      console.log('🟢 Socket.IO CONNECTED to backend');
    });
    
    socket.on('disconnect', (reason) => {
      console.log('🔴 Socket.IO DISCONNECTED:', reason);
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO CONNECTION ERROR:', error);
    });

    // Join the terminal session
    console.log('📡 Emitting terminal:create for session:', sessionId);
    socket.emit('terminal:create', { id: sessionId });
    console.log('📡 Connecting to Express backend terminal:', sessionId);

    // Handle terminal output from backend
    socket.on('terminal:data', ({ id, data }: { id: string; data: string }) => {
      if (id === sessionId && term) {
        // 🔍 DIAGNOSTIC: Log incoming terminal data
        const timestamp = Date.now();
        const dataLength = data.length;
        const hasNewlines = data.includes('\n');
        const hasCarriageReturn = data.includes('\r');
        
        console.log('📡 WEBSOCKET DATA:', {
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
          console.log('🤖 CLAUDE ACTIVATED');
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
          console.log('❌ ERROR DETECTED:', data.substring(0, 100));
          setLastError(data);
        }
      }
    });

    // Handle terminal creation confirmation
    socket.on('terminal:created', ({ id }: { id: string }) => {
      if (id === sessionId) {
        console.log('✅ Terminal connected to Express backend');
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
      console.error('Terminal error:', message);
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
                console.log('👁️ Supervision auto-activated: claude detected');
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
        console.log('Not connected to backend, trying to reconnect...');
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
        console.error('Failed to stop AI team:', error);
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
        
        // Get what user is currently typing, or fall back to last command
        const currentInput = currentLineBuffer.trim();
        const lastCommand = commandHistory.length > 0 ? commandHistory[commandHistory.length - 1] : '';
        const requirement = currentInput || lastCommand || 'Build a web application';
        
        console.log('🎯 AI Team requirement:', { currentInput, lastCommand, final: requirement });
        
        // Spawn AI team via backend API
        const spawnResponse = await fetch('/api/ai-team/spawn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            projectType: 'web-app',
            complexity: 'medium',
            requirement: requirement
          })
        });
        
        if (!spawnResponse.ok) {
          throw new Error(`HTTP ${spawnResponse.status}`);
        }
        
        const spawnResult = await spawnResponse.json();
        console.log('🎯 AI Team spawn result:', spawnResult);
        
        if (spawnResult.success) {
          console.log('✅ Writing to terminal, xtermRef.current:', xtermRef.current);
          xtermRef.current?.writeln(`✅ Team spawned: ${spawnResult.teamId.slice(-8)}`);
          xtermRef.current?.writeln(`👥 ${spawnResult.agents.length} AI agents initialized:`);
          
          // List each agent with their expertise
          spawnResult.agents.forEach((agent: any, index: number) => {
            // Check if expertise exists and is an array, otherwise use role or fallback
            const expertiseText = agent.expertise && Array.isArray(agent.expertise) 
              ? agent.expertise.slice(0, 2).join(', ')
              : agent.role || 'AI Agent';
            xtermRef.current?.writeln(`   ${index + 1}. ${agent.name} - ${expertiseText}`);
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
        console.error('AI Team spawn failed:', error);
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
  }, [sessionId, terminalReady]);

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
              console.log('📜 FOLLOW BUTTON CLICKED');
              try {
                // First try standard method
                xtermRef.current.scrollToBottom();
                
                // Check if it worked, if not force sync
                if (xtermRef.current.buffer && xtermRef.current.buffer.active) {
                  const buffer = xtermRef.current.buffer.active;
                  if (buffer.viewportY !== buffer.baseY) {
                    console.log('🔧 BUTTON FORCING VIEWPORT SYNC:', { 
                      viewportY: buffer.viewportY, 
                      baseY: buffer.baseY,
                      scrollLines: buffer.baseY - buffer.viewportY
                    });
                    xtermRef.current.scrollLines(buffer.baseY - buffer.viewportY);
                  }
                }
                
                setIsUserScrolled(false);
                console.log('✅ Follow button scroll completed');
              } catch (error) {
                console.error('❌ FOLLOW BUTTON ERROR:', error);
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