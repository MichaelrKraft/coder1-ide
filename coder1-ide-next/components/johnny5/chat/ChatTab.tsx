'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send,
  Bot,
  User,
  Loader2,
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
} from 'lucide-react';

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
import { useJohnny5Store } from '@/stores/useJohnny5Store';
import { getSocket } from '@/lib/socket';

// Message interface
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  toolCalls?: ToolCall[];
  thinking?: string;
}

interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: 'pending' | 'running' | 'complete' | 'error';
}

/**
 * ChatTab Component
 *
 * The primary interface for users to talk back and forth with Johnny5.
 * This is the conversational AI assistant experience - not just a dashboard.
 */
export default function ChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hey! I'm Johnny5, your autonomous AI assistant. I can help you with coding, research, monitoring your business, and building features while you sleep. What would you like me to work on?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Moltbot connection status from store
  const { moltbotStatus, setMoltbotStatus } = useJohnny5Store();

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
        });

        // Listen for connection events
        socket.on('johnny5:moltbot-connected', () => {
          setMoltbotStatus({ ...moltbotStatus, connected: true, error: null } as any);
        });

        socket.on('johnny5:moltbot-disconnected', ({ reason }: { reason: string }) => {
          setMoltbotStatus({ ...moltbotStatus, connected: false, error: reason } as any);
        });
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
      }
    };
  }, [setMoltbotStatus]);

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

  // Send message - prefers Moltbot when connected, falls back to Bridge CLI
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Determine which API to use based on Moltbot connection status
      // Prefer Moltbot for 24/7 daemon capabilities, fall back to Bridge CLI
      const useMoltbot = moltbotStatus?.connected === true;
      const apiEndpoint = useMoltbot
        ? '/api/johnny5/moltbot/chat'
        : '/api/johnny5/chat';

      console.log(`[ChatTab] Using ${useMoltbot ? 'Moltbot' : 'Bridge'} chat API`);

      // Call the appropriate Johnny5 chat API
      let response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: useMoltbot
          ? JSON.stringify({
              message: userMessage.content,
              sessionKey: 'dashboard:main', // Default session for dashboard chat
            })
          : JSON.stringify({
              message: userMessage.content,
              history: messages.slice(-10), // Send last 10 messages for context
            }),
      });

      let data = await response.json();

      // Handle MOLTBOT_DISABLED error - retry with main chat endpoint
      if (data.code === 'MOLTBOT_DISABLED' && useMoltbot) {
        console.log('[ChatTab] Moltbot disabled, retrying with main chat endpoint');
        response = await fetch('/api/johnny5/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage.content,
            history: messages.slice(-10),
          }),
        });
        data = await response.json();
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
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
        )
      );

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.data?.response || data.response,
        timestamp: new Date(),
        toolCalls: data.data?.toolCalls || data.toolCalls,
        thinking: data.data?.thinking || data.thinking,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);

      // Update user message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id ? { ...msg, status: 'error' } : msg
        )
      );

      // Add error message with the specific error text
      const errorText = error instanceof Error ? error.message : "Sorry, I encountered an error. Please try again or check your API connection.";
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: errorText,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Clear chat
  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-new',
        role: 'assistant',
        content: "Chat cleared! What would you like me to help with?",
        timestamp: new Date(),
      },
    ]);
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
            <p className="text-[10px] text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              Online • Ready to assist
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearChat}
            className="p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-secondary transition-all"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-bg-tertiary text-text-muted hover:text-text-secondary transition-all"
            title="Chat settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

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
                  : 'bg-purple-500/20 text-purple-400'
              }`}
            >
              {message.role === 'user' ? (
                <User className="w-4 h-4" />
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
                  {message.id === 'welcome' ? (
                    <TypewriterText text={message.content} speed={25} />
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
        {/* Quick actions */}
        <div className="flex items-center gap-2 mb-2">
          <button className="px-2.5 py-1 rounded-lg bg-bg-tertiary hover:bg-bg-secondary text-[10px] text-text-muted hover:text-text-secondary transition-all flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Build a feature
          </button>
          <button className="px-2.5 py-1 rounded-lg bg-bg-tertiary hover:bg-bg-secondary text-[10px] text-text-muted hover:text-text-secondary transition-all flex items-center gap-1.5">
            <Brain className="w-3 h-3" />
            Research
          </button>
          <button className="px-2.5 py-1 rounded-lg bg-bg-tertiary hover:bg-bg-secondary text-[10px] text-text-muted hover:text-text-secondary transition-all flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" />
            Check status
          </button>
        </div>

        {/* Input */}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Johnny5..."
              rows={1}
              className="w-full px-4 py-3 pr-12 rounded-xl bg-bg-tertiary border border-border-default focus:border-coder1-cyan/50 focus:ring-1 focus:ring-coder1-cyan/20 text-sm text-text-primary placeholder-text-muted resize-none transition-all outline-none"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className={`absolute right-2 bottom-2 p-2 rounded-lg transition-all ${
                inputValue.trim() && !isLoading
                  ? 'bg-coder1-cyan text-bg-primary hover:bg-coder1-cyan/80'
                  : 'bg-bg-secondary text-text-muted'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <p className="text-[10px] text-text-muted mt-2 text-center">
          Johnny5 can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
