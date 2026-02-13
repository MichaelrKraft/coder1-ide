'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Zap,
  Brain,
  Settings2,
  MoreHorizontal,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Terminal,
  ShieldAlert,
  AlertTriangle,
  ArrowUpRight,
  Square,
  Mic,
  MicOff,
} from 'lucide-react';
import UpgradePrompt, { QuotaMeter } from '../UpgradePrompt';
import { useIDEStore } from '@/stores/useIDEStore';
import { terminalObserver, type TerminalEvent } from '@/lib/terminal-observer';
import { useTerminalSupervision, type SupervisionAlert } from '@/lib/hooks/useTerminalSupervision';
import { useBridgeConnectionState } from '@/lib/useBridgeConnectionState';
import {
  parseExecuteBashTags,
  hasExecuteBashTags,
  updateCommandResult,
} from '@/lib/johnny5-command-parser';
import { executeAndCapture } from '@/lib/terminal-output-capture';
import TaskQueueDropdown from './TaskQueueDropdown';
import { useTaskQueueStore } from '@/stores/useTaskQueueStore';

// Typewriter effect component for Johnny5's welcome message
function TypewriterText({
  text,
  speed = 25,
  onComplete
}: {
  text: string;
  speed?: number;
  onComplete?: () => void;
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Reset state when component mounts (plays every time)
    setDisplayedText('');
    setIsComplete(false);

    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  return (
    <span>
      {displayedText}
      {!isComplete && (
        <span className="inline-block w-0.5 h-4 bg-coder1-cyan ml-0.5 animate-pulse" />
      )}
    </span>
  );
}

// Mode indicator component for showing Johnny5's current operational mode
function ModeIndicator({ mode }: { mode: 'moltbot' | 'bridge' | 'gemini' | null }) {
  const modeInfo: Record<string, { label: string; description: string; colorClass: string; dotClass: string }> = {
    moltbot: {
      label: 'Full Autonomy',
      description: 'MCP tools, 24/7 operation',
      colorClass: 'text-green-400',
      dotClass: 'bg-green-400',
    },
    bridge: {
      label: 'Bridge Mode',
      description: 'Claude Code CLI',
      colorClass: 'text-yellow-400',
      dotClass: 'bg-yellow-400',
    },
    gemini: {
      label: 'Basic Chat',
      description: 'Memory + reasoning',
      colorClass: 'text-gray-400',
      dotClass: 'bg-gray-400',
    },
  };

  const info = mode ? modeInfo[mode] : modeInfo.gemini;

  return (
    <div className="flex items-center gap-1.5" title={info.description}>
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${info.dotClass}`} />
      <span className={`text-[10px] ${info.colorClass}`}>
        Online • {info.label}
      </span>
    </div>
  );
}

import { AlertCircle } from 'lucide-react';
import { useJohnny5Store } from '@/stores/useJohnny5Store';
import crewData from '@/data/crew-members.json';
import { getSocket } from '@/lib/socket';

import { Johnny5ChatMessage, Johnny5ChatToolCall } from '@/types';

// Local aliases for compatibility
type ChatMessage = Johnny5ChatMessage;
type ToolCall = Johnny5ChatToolCall;

interface Johnny5Mode {
  mode: 'moltbot' | 'bridge' | 'gemini';
  capabilities: string[];
  hasMCP: boolean;
  provider: string;
  isLimitedMode: boolean;
}

interface QuotaInfo {
  messageCount: number;
  limit: number;
  remaining: number;
  tierType: 'gemini_trial' | 'claude_trial' | 'pro_unlimited';
  isProSubscriber: boolean;
}

interface QuotaExceeded {
  tierType: 'gemini_trial' | 'claude_trial';
  messageCount: number;
  limit: number;
  upgradeUrl: string;
}

/**
 * ChatTab Component
 *
 * The primary interface for users to talk back and forth with Johnny5.
 * This is the conversational AI assistant experience - not just a dashboard.
 */
export default function ChatTab() {
  // Chat messages and session ID live in the store so they persist across tab switches
  const {
    chatMessages,
    chatSessionId,
    addChatMessage,
    updateChatMessage: updateChatMsg,
    clearChat,
    setChatSessionId,
    markWelcomeAnimationPlayed,
    moltbotStatus,
    setMoltbotStatus,
    activeCrewMember,
  } = useJohnny5Store();

  // Aliases for compatibility with existing code
  const messages = chatMessages;
  const sessionId = chatSessionId;

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState<QuotaExceeded | null>(null);
  const [johnny5Mode, setJohnny5Mode] = useState<Johnny5Mode | null>(null);
  const [memoryStatus, setMemoryStatus] = useState<'full' | 'partial' | 'minimal' | 'none' | null>(null);
  const [memoryBannerDismissed, setMemoryBannerDismissed] = useState(false);
  const [limitedModeDismissed, setLimitedModeDismissed] = useState(false);
  const [observations, setObservations] = useState<TerminalEvent[]>([]);
  const [isDelegating, setIsDelegating] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const [activeTerminalSessionId, setActiveTerminalSessionId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const lastObservationRef = useRef<number>(0); // Rate limiting

  // Bridge connection state for reliable mode updates
  const { isConnected: bridgeConnected } = useBridgeConnectionState();

  // Terminal supervision
  const { alerts: supervisionAlerts, dismissAlert: dismissSupervisionAlert } = useTerminalSupervision({
    enabled: true,  // Always enabled for now
    alertThreshold: 'moderate',
    onAlert: (alert: SupervisionAlert) => {
      // Add critical/warning supervision alerts as system messages in chat
      if (alert.severity !== 'info') {
        addChatMessage({
          id: `sup-${alert.id}`,
          role: 'system' as const,
          content: `[Supervision] ${alert.message}${alert.details ? '\n' + alert.details : ''}`,
          timestamp: new Date(alert.timestamp),
        });
      }
    },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle scroll to show/hide scroll button
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  }, [inputValue]);

  // Task queue store for completion detection
  const { getNextTask, markTaskComplete } = useTaskQueueStore();

  // Completion detection - auto-load next task when Johnny5 signals completion
  const COMPLETION_SIGNALS = [
    'done', 'complete', 'completed', 'finished', 'all set',
    'task complete', "that's everything", 'ready for next',
    'successfully', 'implementation complete', 'changes committed'
  ];

  useEffect(() => {
    // Only check the last message
    if (messages.length === 0 || isLoading) return;

    const lastMessage = messages[messages.length - 1];

    // Only check assistant messages
    if (lastMessage.role !== 'assistant') return;

    // Check if message contains completion signals
    const content = lastMessage.content.toLowerCase();
    const hasCompletionSignal = COMPLETION_SIGNALS.some(signal =>
      content.includes(signal)
    );

    if (hasCompletionSignal) {
      const nextTask = getNextTask();
      if (nextTask && !inputValue.trim()) {
        // Auto-load next task into input
        setInputValue(nextTask.task_text);
        markTaskComplete(nextTask.id);
        inputRef.current?.focus();
      }
    }
  }, [messages, isLoading, getNextTask, markTaskComplete, inputValue]);

  // Resolve active crew member details for prompt injection
  const activeCrewInfo = useMemo(() => {
    if (!activeCrewMember) return null;
    const members = (crewData as { crewMembers: { id: string; name: string; promptPrefix: string }[] }).crewMembers;
    return members.find(m => m.id === activeCrewMember) || null;
  }, [activeCrewMember]);

  // Fetch Johnny5 mode - extracted as callback so it can be called from socket events
  const fetchJohnny5Mode = useCallback(async () => {
    try {
      const response = await fetch('/api/johnny5/mode');
      if (response.ok) {
        const mode = await response.json() as Johnny5Mode;
        setJohnny5Mode(mode);
      }
    } catch (err) {
      console.warn('Failed to fetch Johnny5 mode:', err);
      // Fallback to gemini mode if fetch fails
      setJohnny5Mode({
        mode: 'gemini',
        capabilities: ['Memory', 'Reasoning'],
        hasMCP: false,
        provider: 'Gemini 2.5 Flash',
        isLimitedMode: true,
      });
    }
  }, []);

  // Fetch Johnny5 mode on mount and poll periodically
  useEffect(() => {
    fetchJohnny5Mode();

    // Poll mode every 30s so the Limited Mode banner clears when bridge connects after page load
    const interval = setInterval(fetchJohnny5Mode, 30000);
    return () => clearInterval(interval);
  }, [fetchJohnny5Mode]);

  // Subscribe to Moltbot status updates via Socket.IO
  useEffect(() => {
    let socket: any = null;

    const setupSocket = async () => {
      try {
        socket = await getSocket();

        // Request initial status
        socket.emit('johnny5:status');

        // Listen for status updates
        socket.on('johnny5:status', (status: any) => {
          setMoltbotStatus(status);
          useIDEStore.getState().setConnectionStatus('ai', !!status?.connected);
        });

        // Listen for connection events
        socket.on('johnny5:moltbot-connected', () => {
          setMoltbotStatus({ ...moltbotStatus, connected: true, error: null } as any);
          useIDEStore.getState().setConnectionStatus('ai', true);
        });

        socket.on('johnny5:moltbot-disconnected', ({ reason }: { reason: string }) => {
          setMoltbotStatus({ ...moltbotStatus, connected: false, error: reason } as any);
          useIDEStore.getState().setConnectionStatus('ai', false);
        });

        // Listen for Johnny5 context ready for Claude sessions
        socket.on('johnny5:claude-context-ready', (data: { sessionId: string; context: string; factCount: number }) => {
          if (data.factCount > 0) {
            addChatMessage({
              id: `ctx-${Date.now()}`,
              role: 'system' as const,
              content: `Context shared with Claude Code session (${data.factCount} facts available)`,
              timestamp: new Date(),
            });
          }
        });

        // Track active terminal session for command execution
        socket.on('terminal:session-created', (data: { id: string }) => {
          setActiveTerminalSessionId(data.id);
          console.log('[ChatTab] Active terminal session:', data.id);
        });

        socket.on('terminal:session-attached', (data: { id: string }) => {
          setActiveTerminalSessionId(data.id);
          console.log('[ChatTab] Attached to terminal session:', data.id);
        });

        // NOTE: Bridge connection detection moved to useBridgeConnectionState hook (Feb 2026)
        // The hook handles Socket.IO timing more reliably
      } catch (err) {
        console.error('Failed to setup socket for Johnny5:', err);
      }
    };

    setupSocket();

    return () => {
      if (socket) {
        socket.off('johnny5:status');
        socket.off('johnny5:moltbot-connected');
        socket.off('johnny5:moltbot-disconnected');
        socket.off('johnny5:claude-context-ready');
        socket.off('terminal:session-created');
        socket.off('terminal:session-attached');
      }
    };
  }, [setMoltbotStatus, fetchJohnny5Mode]);

  // Listen for setup wizard completion to refresh mode and clear Limited Mode banner
  useEffect(() => {
    const handleSetupComplete = () => {
      console.log('[ChatTab] Setup wizard complete - refreshing Johnny5 mode');
      fetchJohnny5Mode();
    };

    window.addEventListener('johnny5:setup-complete', handleSetupComplete);
    return () => window.removeEventListener('johnny5:setup-complete', handleSetupComplete);
  }, [fetchJohnny5Mode]);

  // FIX (Feb 2026): Refresh Johnny5 mode when bridge connection state changes
  // Uses useBridgeConnectionState hook which handles Socket.IO timing reliably
  useEffect(() => {
    if (bridgeConnected) {
      console.log('[ChatTab] Bridge connection detected via hook - refreshing mode');
      fetchJohnny5Mode();
    }
  }, [bridgeConnected, fetchJohnny5Mode]);

  // Initialize session ID only if not already set (store persists across tab switches)
  useEffect(() => {
    if (!chatSessionId) {
      const newSessionId = `session-${Date.now()}`;
      setChatSessionId(newSessionId);
      console.log('[ChatTab] Starting fresh session:', newSessionId);
    }
  }, [chatSessionId, setChatSessionId]);

  // Subscribe to terminal events for observation
  useEffect(() => {
    terminalObserver.connect();

    const unsubscribe = terminalObserver.subscribe((event: TerminalEvent) => {
      const now = Date.now();
      // Rate limit: max 1 observation per 10 seconds
      if (now - lastObservationRef.current < 10000) return;
      lastObservationRef.current = now;

      // Only show errors, completion, and session events (skip routine commands/file changes)
      if (event.type === 'command') return;

      // Add observation as a system message
      addChatMessage({
        id: `obs-${now}`,
        role: 'system' as const,
        content: event.summary,
        timestamp: new Date(event.timestamp),
      });

      // Store observation for context
      setObservations(prev => [...prev.slice(-10), event]); // Keep last 10
    });

    return () => {
      unsubscribe();
      terminalObserver.disconnect();
    };
  }, []);

  // Abort in-flight request on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Helper function to get connection status display
  const getConnectionStatus = () => {
    if (!moltbotStatus) {
      return { color: 'bg-gray-400', text: 'Unknown', tooltip: 'Checking connection...' };
    }
    if (moltbotStatus.connected) {
      return { color: 'bg-green-500', text: 'Connected', tooltip: 'Connected to Johnny5 daemon' };
    }
    // Fallback mode is active and working - show as connected since chat works
    if (moltbotStatus.fallbackActive) {
      return { color: 'bg-green-500', text: 'Connected', tooltip: 'Using Claude API directly' };
    }
    if (moltbotStatus.reconnectAttempts > 0) {
      return { color: 'bg-yellow-500', text: 'Reconnecting', tooltip: `Reconnecting... (attempt ${moltbotStatus.reconnectAttempts})` };
    }
    return { color: 'bg-red-500', text: 'Disconnected', tooltip: 'Johnny5 unavailable' };
  };

  const connectionStatus = getConnectionStatus();

  // Copy message content
  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Delegate task to Claude Code in terminal
  const handleDelegate = useCallback(async (task: string) => {
    setIsDelegating(true);
    try {
      const socket = await getSocket();

      // Emit delegation request - server will find the active terminal session
      socket.emit('johnny5:delegate-task', {
        sessionId: 'default',
        task
      });

      // Listen for result (one-time)
      const resultPromise = new Promise<void>((resolve) => {
        const handler = (result: { success: boolean; error?: string; method?: string }) => {
          socket.off('johnny5:delegate-result', handler);

          if (result.success) {
            addChatMessage({
              id: `delegate-${Date.now()}`,
              role: 'system' as const,
              content: `Task delegated to Claude Code (${result.method}): "${task}"`,
              timestamp: new Date(),
            });
          } else {
            addChatMessage({
              id: `delegate-err-${Date.now()}`,
              role: 'system' as const,
              content: `Failed to delegate: ${result.error || 'Unknown error'}. Is Claude Code running in the terminal?`,
              timestamp: new Date(),
            });
          }
          resolve();
        };
        socket.on('johnny5:delegate-result', handler);

        // Timeout after 5 seconds
        setTimeout(() => {
          socket.off('johnny5:delegate-result', handler);
          resolve();
        }, 5000);
      });

      await resultPromise;
    } catch (err) {
      console.error('[ChatTab] Delegation error:', err);
      addChatMessage({
        id: `delegate-err-${Date.now()}`,
        role: 'system' as const,
        content: 'Failed to delegate task. Check terminal connection.',
        timestamp: new Date(),
      });
    } finally {
      setIsDelegating(false);
    }
  }, []);

  // Stop in-flight Johnny5 request
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal && event.results[i][0]) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript.trim()) {
          setInputValue(prev => prev ? prev + ' ' + transcript.trim() : transcript.trim());
        }
      };

      recognition.onend = () => setVoiceListening(false);
      recognition.onerror = () => setVoiceListening(false);

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceRecognition = async () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (voiceListening) {
      recognition.stop();
      setVoiceListening(false);
    } else {
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        recognition.start();
        setVoiceListening(true);
      } catch {
        setVoiceListening(false);
      }
    }
  };

  // Send message - prefers Moltbot when connected, falls back to Bridge CLI
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Check for delegation command
    const delegateMatch = inputValue.trim().match(/^\/delegate\s+(.+)/i);
    if (delegateMatch) {
      setInputValue('');
      await handleDelegate(delegateMatch[1]);
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      status: 'sending',
    };

    addChatMessage(userMessage);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);

    // Create abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Determine which API to use based on Moltbot connection status
      // Prefer Moltbot for 24/7 daemon capabilities, fall back to Bridge CLI
      const useMoltbot = moltbotStatus?.connected === true;
      const apiEndpoint = useMoltbot
        ? '/api/johnny5/moltbot/chat'
        : '/api/johnny5/chat';

      console.log(`[ChatTab] Using ${useMoltbot ? 'Moltbot' : 'Bridge'} chat API`);

      // Get auth token from localStorage if available
      const authToken = typeof window !== 'undefined'
        ? localStorage.getItem('coder1_access_token')
        : null;

      // Call the appropriate Johnny5 chat API
      let response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        },
        body: useMoltbot
          ? JSON.stringify({
              message: userMessage.content,
              sessionKey: 'dashboard:main', // Default session for dashboard chat
            })
          : JSON.stringify({
              message: userMessage.content,
              sessionId: sessionId,  // Pass session ID for conversation continuity
              history: messages.slice(-10), // Send last 10 messages for context
              terminalContext: terminalObserver.getRecentContext(1500),
              ...(activeCrewInfo ? { crewContext: { name: activeCrewInfo.name, promptPrefix: activeCrewInfo.promptPrefix } } : {}),
            }),
        signal: controller.signal,
      });

      let data = await response.json();

      // Handle MOLTBOT_DISABLED error - retry with main chat endpoint
      if (data.code === 'MOLTBOT_DISABLED' && useMoltbot) {
        console.log('[ChatTab] Moltbot disabled, retrying with main chat endpoint');
        response = await fetch('/api/johnny5/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            message: userMessage.content,
            sessionId: sessionId,
            history: messages.slice(-10),
          }),
          signal: controller.signal,
        });
        data = await response.json();
      }

      // Handle quota exceeded (402) response
      if (response.status === 402 && data.code === 'QUOTA_EXCEEDED') {
        setQuotaExceeded({
          tierType: data.tierType,
          messageCount: data.messageCount,
          limit: data.limit,
          upgradeUrl: data.upgradeUrl,
        });
        // Update user message status to error
        updateChatMsg(userMessage.id, { status: 'error' });
        setIsLoading(false);
        setIsTyping(false);
        return; // Don't throw, just show the upgrade prompt
      }

      // Handle specific error codes from both Bridge-based and Moltbot chat
      if (!response.ok || !data.success) {
        const errorCode = data.code;
        let errorMessage = "Sorry, I encountered an error. Please try again.";

        if (errorCode === 'BRIDGE_NOT_CONNECTED') {
          errorMessage = "🔌 Bridge not connected! Please run 'coder1-bridge start' in your terminal and enter the pairing code.";
        } else if (errorCode === 'BRIDGE_ERROR') {
          errorMessage = "⚠️ Bridge error. Please check that coder1-bridge is running and try again.";
        } else if (errorCode === 'COMMAND_TIMEOUT') {
          errorMessage = "⏳ Request timed out. Please try again with a simpler request.";
        } else if (response.status === 503) {
          errorMessage = "🔌 Johnny5 daemon not available. Please ensure ManusLive is running.";
        } else if (response.status === 401) {
          errorMessage = "🔑 Authentication failed. Please check your MOLTBOT_AUTH_TOKEN.";
        } else if (data.error) {
          errorMessage = `Error: ${data.error}`;
        }

        throw new Error(errorMessage);
      }

      // Update user message status
      updateChatMsg(userMessage.id, { status: 'sent' });

      // Update quota from response if available
      if (data.data?.quota) {
        setQuota(data.data.quota);
        // Clear any previous quota exceeded state on successful message
        setQuotaExceeded(null);
      }

      // Read memory status from response
      const responseMemoryStatus = data.data?.memoryStatus || data.memoryStatus;
      if (responseMemoryStatus) {
        setMemoryStatus(responseMemoryStatus);
      }

      // Track session ID from response
      const responseSessionId = data.data?.sessionId || data.sessionId;
      if (responseSessionId) {
        setChatSessionId(responseSessionId);
      }

      // Update mode from response if present (detects mode changes)
      const responseMode = data.data?.mode || data.mode;
      if (responseMode) {
        const previousMode = johnny5Mode?.mode;
        const newMode: Johnny5Mode = {
          mode: responseMode.mode,
          capabilities: responseMode.hasMCP
            ? ['Memory', 'MCP Tools', 'Project Context', ...(responseMode.is24x7 ? ['24/7 Operation'] : [])]
            : ['Memory', 'Reasoning'],
          hasMCP: responseMode.hasMCP,
          provider: responseMode.provider,
          isLimitedMode: responseMode.mode === 'gemini',
        };
        setJohnny5Mode(newMode);

        // Log mode change for debugging
        if (previousMode && previousMode !== responseMode.mode) {
          console.log(`[Johnny5] Mode changed: ${previousMode} → ${responseMode.mode}`);
        }
      }

      // Get raw response
      const rawResponse = data.data?.response || data.response;

      // Check for <execute_bash> commands
      let finalContent = rawResponse;
      if (hasExecuteBashTags(rawResponse) && johnny5Mode?.hasMCP && activeTerminalSessionId) {
        const { commands, displayResponse } = parseExecuteBashTags(rawResponse);

        // Add initial message with pending indicators
        const assistantMsgId = `assistant-${Date.now()}`;
        addChatMessage({
          id: assistantMsgId,
          role: 'assistant',
          content: displayResponse,
          timestamp: new Date(),
          toolCalls: data.data?.toolCalls || data.toolCalls,
          thinking: data.data?.thinking || data.thinking,
          reasoningSteps: data.data?.reasoningSteps,
        });

        // Execute commands sequentially
        if (commands.length > 0) {
          setIsExecutingCommand(true);
          let updatedContent = displayResponse;

          try {
            const socket = await getSocket();

            for (const cmd of commands) {
              console.log(`[Johnny5] Executing command: ${cmd.command}`);

              // Execute and capture output
              const result = await executeAndCapture(
                socket,
                activeTerminalSessionId,
                cmd.command,
                { timeoutMs: 30000, maxBytes: 10240 }
              );

              // Determine status
              const status = result.timedOut ? 'timeout' : 'success';

              // Update content with result
              const commandResult = updateCommandResult(
                '',
                cmd.command,
                result.output,
                status
              );

              // Add result after the command indicator
              updatedContent += commandResult;

              // Update the message with results so far
              updateChatMsg(assistantMsgId, { content: updatedContent });

              // Audit log the command execution via server (non-blocking)
              socket.emit('johnny5:audit-command', {
                sessionId,
                command: cmd.command,
                output: result.output.slice(0, 1000), // First 1KB only
                timedOut: result.timedOut,
                truncated: result.truncated,
                durationMs: result.durationMs,
              });

              console.log(`[Johnny5] Command completed: ${cmd.command} (${status}, ${result.durationMs}ms)`);
            }
          } catch (execError) {
            console.error('[Johnny5] Command execution error:', execError);
            updatedContent += '\n\n❌ Error executing commands. Check terminal connection.';
            updateChatMsg(assistantMsgId, { content: updatedContent });
          } finally {
            setIsExecutingCommand(false);
          }
        }
      } else if (hasExecuteBashTags(rawResponse) && !johnny5Mode?.hasMCP) {
        // Has commands but no MCP access - show warning
        const { displayResponse } = parseExecuteBashTags(rawResponse);
        finalContent = displayResponse + '\n\n⚠️ *Commands detected but cannot execute - Bridge not connected.*';

        addChatMessage({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: finalContent,
          timestamp: new Date(),
          toolCalls: data.data?.toolCalls || data.toolCalls,
          thinking: data.data?.thinking || data.thinking,
          reasoningSteps: data.data?.reasoningSteps,
        });
      } else {
        // No commands - add message normally
        addChatMessage({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: finalContent,
          timestamp: new Date(),
          toolCalls: data.data?.toolCalls || data.toolCalls,
          thinking: data.data?.thinking || data.thinking,
          reasoningSteps: data.data?.reasoningSteps,
        });
      }
    } catch (error) {
      // User cancelled the request — not an error
      if (error instanceof DOMException && error.name === 'AbortError') {
        updateChatMsg(userMessage.id, { status: 'sent' });
        return;
      }

      console.error('Chat error:', error);

      // Update user message with error
      updateChatMsg(userMessage.id, { status: 'error' });

      // Add error message with the specific error text
      const errorText = error instanceof Error ? error.message : "Sorry, I encountered an error. Please try again or check your API connection.";
      addChatMessage({
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: errorText,
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isLoading) {
      e.preventDefault();
      handleStop();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Clear chat
  const handleClearChat = () => {
    // Abort any in-flight request
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setIsTyping(false);

    clearChat(); // Resets messages to welcome + generates new sessionId
    setMemoryBannerDismissed(false);
    setMemoryStatus(null);
    setObservations([]);
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-bg-secondary/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coder1-cyan/20 to-purple-500/20 flex items-center justify-center border border-coder1-cyan/30">
              <Bot className="w-5 h-5 text-coder1-cyan" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-bg-secondary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Johnny5</h3>
            <ModeIndicator mode={johnny5Mode?.mode || null} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Quota Meter */}
          {quota && (
            <QuotaMeter
              messageCount={quota.messageCount}
              limit={quota.limit}
              tierType={quota.tierType}
              isProSubscriber={quota.isProSubscriber}
            />
          )}
          <button
            onClick={handleClearChat}
            className="p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-secondary transition-all"
            title="Clear Chat&#10;Start a fresh conversation with Johnny5"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-secondary transition-all"
            title="Chat Settings&#10;Configure message display and behavior"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Limited Mode Warning Banner - Compact */}
      {johnny5Mode?.isLimitedMode && !limitedModeDismissed && (
        <div className="px-4 py-1.5 bg-yellow-500/10 border-b border-yellow-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-yellow-300">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Limited Mode — run <code className="bg-cyan-900/40 px-1 rounded font-mono text-cyan-300">coder1-bridge start</code> for full access</span>
          </div>
          <button
            onClick={() => setLimitedModeDismissed(true)}
            className="p-1 hover:bg-white/10 rounded text-yellow-400"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Memory Status Indicator */}
      {memoryStatus && memoryStatus !== 'full' && !memoryBannerDismissed && (
        <div className={`px-4 py-2 border-b flex items-center justify-between text-xs ${
          memoryStatus === 'none'
            ? 'bg-red-500/10 border-red-500/30 text-red-300'
            : memoryStatus === 'minimal'
            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
            : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
        }`}>
          <div className="flex items-center gap-2">
            <Brain className="w-3.5 h-3.5" />
            <span>
              {memoryStatus === 'none' && 'Memory unavailable \u2014 responses won\'t reference past conversations'}
              {memoryStatus === 'minimal' && 'Memory limited \u2014 basic context only, no past conversation recall'}
              {memoryStatus === 'partial' && 'Memory: keyword-only \u2014 embeddings unavailable'}
            </span>
          </div>
          <button
            onClick={() => setMemoryBannerDismissed(true)}
            className="p-1 hover:bg-white/10 rounded"
            title="Dismiss"
          >
            {'\u00d7'}
          </button>
        </div>
      )}

      {/* Supervision Alerts */}
      {supervisionAlerts.length > 0 && (
        <div className="px-4 py-2 border-b border-red-500/30 bg-red-500/10">
          {supervisionAlerts.slice(0, 3).map(alert => (
            <div key={alert.id} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2 text-xs">
                <ShieldAlert className={`w-3.5 h-3.5 ${
                  alert.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'
                }`} />
                <span className={alert.severity === 'critical' ? 'text-red-300' : 'text-yellow-300'}>
                  {alert.message}
                </span>
              </div>
              <button
                onClick={() => dismissSupervisionAlert(alert.id)}
                className="text-xs text-text-muted hover:text-text-secondary p-1"
              >
                {'\u00d7'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'user' ? 'flex-row-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                message.role === 'user'
                  ? 'bg-coder1-cyan/20 text-coder1-cyan'
                  : message.role === 'system'
                  ? message.id.startsWith('sup-')
                    ? 'bg-red-500/15 text-red-400'
                    : 'bg-yellow-500/15 text-yellow-400'
                  : 'bg-purple-500/20 text-purple-400'
              }`}
            >
              {message.role === 'user' ? (
                <User className="w-4 h-4" />
              ) : message.role === 'system' ? (
                message.id.startsWith('sup-')
                  ? <ShieldAlert className="w-3.5 h-3.5" />
                  : <Terminal className="w-3.5 h-3.5" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>

            {/* Message Content */}
            <div
              className={`group flex-1 max-w-[85%] ${
                message.role === 'user' ? 'text-right' : ''
              }`}
            >
              <div
                className={`inline-block px-4 py-3 rounded-2xl text-sm ${
                  message.role === 'user'
                    ? 'bg-coder1-cyan/20 text-text-primary rounded-tr-md'
                    : message.role === 'system'
                    ? message.id.startsWith('sup-')
                      ? 'bg-red-500/10 text-red-200/80 rounded-tl-md text-xs border border-red-500/20'
                      : 'bg-yellow-500/10 text-yellow-200/80 rounded-tl-md text-xs border border-yellow-500/20'
                    : 'bg-bg-tertiary text-text-primary rounded-tl-md'
                }`}
              >
                {/* Thinking indicator */}
                {message.thinking && (
                  <div className="mb-2 pb-2 border-b border-border-default">
                    <div className="flex items-center gap-2 text-[10px] text-text-muted mb-1">
                      <Brain className="w-3 h-3" />
                      <span>Thinking...</span>
                    </div>
                    <p className="text-xs text-text-muted italic">
                      {message.thinking.slice(0, 100)}...
                    </p>
                  </div>
                )}

                {/* Reasoning steps */}
                {message.reasoningSteps && message.reasoningSteps.length > 0 && (
                  <details className="mb-2 pb-2 border-b border-border-default group/reasoning">
                    <summary className="flex items-center gap-1.5 text-[10px] text-text-muted cursor-pointer hover:text-text-secondary select-none list-none">
                      <Brain className="w-3 h-3" />
                      <span>{message.reasoningSteps.length} steps</span>
                      <ChevronRight className="w-3 h-3 ml-auto" />
                    </summary>
                    <div className="mt-1.5 space-y-0.5">
                      {message.reasoningSteps.map((step, i) => (
                        <div key={i} className="text-[10px] text-text-muted flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-coder1-cyan/50 flex-shrink-0" />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* Tool calls */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mb-2 pb-2 border-b border-border-default space-y-1">
                    {message.toolCalls.map((tool) => (
                      <div
                        key={tool.id}
                        className="flex items-center gap-2 text-[10px] text-text-muted"
                      >
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span className="font-mono">{tool.name}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8px] ${
                            tool.status === 'complete'
                              ? 'bg-green-500/20 text-green-400'
                              : tool.status === 'error'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {tool.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Message text */}
                <div className="whitespace-pre-wrap">
                  {message.id.startsWith('welcome') && !message.animationPlayed ? (
                    <TypewriterText text={message.content} speed={25} onComplete={() => markWelcomeAnimationPlayed()} />
                  ) : (
                    message.content
                  )}
                </div>
              </div>

              {/* Message footer */}
              <div
                className={`flex items-center gap-2 mt-1 ${
                  message.role === 'user' ? 'justify-end' : ''
                }`}
              >
                <span className="text-[10px] text-text-muted">
                  {formatTime(message.timestamp)}
                </span>
                {message.status === 'error' && (
                  <span className="text-[10px] text-red-400">Failed to send</span>
                )}
                {message.role === 'assistant' && (
                  <button
                    onClick={() => handleCopy(message.content, message.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-secondary transition-all"
                  >
                    {copiedId === message.id ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-purple-400" />
            </div>
            <div className="bg-bg-tertiary rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Prompt when quota exceeded */}
        {quotaExceeded && (
          <UpgradePrompt
            tierType={quotaExceeded.tierType}
            messageCount={quotaExceeded.messageCount}
            limit={quotaExceeded.limit}
            upgradeUrl={quotaExceeded.upgradeUrl}
            onDismiss={() => setQuotaExceeded(null)}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 p-2 rounded-full bg-bg-tertiary border border-border-default shadow-lg hover:bg-bg-secondary transition-all"
        >
          <ChevronDown className="w-4 h-4 text-text-muted" />
        </button>
      )}

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-border-default bg-bg-secondary/30">
        {/* Task Queue */}
        <div className="mb-2">
          <TaskQueueDropdown
            onTaskSelect={(taskText) => {
              setInputValue(taskText);
              inputRef.current?.focus();
            }}
          />
        </div>

        {/* Input */}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? "Press Esc to stop..." : activeCrewInfo ? `Ask the ${activeCrewInfo.name}...` : "Message Johnny5..."}
              rows={1}
              className={`w-full px-4 py-3 ${isLoading ? 'pr-12' : 'pr-20'} rounded-xl bg-bg-tertiary border border-border-default focus:border-coder1-cyan/50 focus:ring-1 focus:ring-coder1-cyan/20 text-sm text-text-primary placeholder-text-muted resize-none transition-all outline-none`}
              disabled={false}
            />
            {isLoading ? (
              <button
                onClick={handleStop}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all bg-red-500/80 text-white hover:bg-red-500"
                title="Stop generating (Esc)"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                {recognitionRef.current && (
                  <button
                    onClick={toggleVoiceRecognition}
                    className={`absolute right-9 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
                      voiceListening
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
                    }`}
                    title={voiceListening ? 'Stop listening' : 'Voice input'}
                  >
                    {voiceListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </button>
                )}
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
                    inputValue.trim()
                      ? 'bg-coder1-cyan text-bg-primary hover:bg-coder1-cyan/80'
                      : 'bg-bg-secondary text-text-muted'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-[10px] text-text-muted mt-2 text-center">
          Johnny5 can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
