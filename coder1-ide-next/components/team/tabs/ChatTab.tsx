'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
}

interface ChatTabProps {
  teamId: string;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatTab({ teamId }: ChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load initial messages on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/team/${teamId}/chat?limit=50`);
        const data = await res.json();
        if (data.success) {
          // API returns DESC order, reverse for display (oldest first)
          setMessages(data.data.reverse());
          setHasMore(data.data.length === 50);
        }
      } catch (err) {
        setError('Failed to load messages');
      } finally {
        setIsLoading(false);
      }
    };
    loadMessages();
  }, [teamId]);

  // Socket.IO subscription for real-time messages
  useEffect(() => {
    let sock: any = null;
    const setup = async () => {
      try {
        const { getSocket } = await import('@/lib/socket');
        sock = await getSocket();
        sock.on('team:chat:message', ({ teamId: msgTeamId, message }: any) => {
          if (msgTeamId === teamId) {
            setMessages(prev => {
              // Avoid duplicates (optimistic + socket)
              if (prev.some(m => m.id === message.id)) return prev;
              return [...prev, message];
            });
          }
        });
      } catch (err) {
        console.warn('Socket connection failed for chat:', err);
      }
    };
    setup();
    return () => {
      sock?.off('team:chat:message');
    };
  }, [teamId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load more (infinite scroll up)
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || messages.length === 0) return;
    const oldest = messages[0];
    try {
      const res = await fetch(`/api/team/${teamId}/chat?limit=50&before=${oldest.created_at}`);
      const data = await res.json();
      if (data.success) {
        const older: ChatMessage[] = data.data.reverse();
        setMessages(prev => [...older, ...prev]);
        setHasMore(data.data.length === 50);
      }
    } catch (err) {
      console.warn('Failed to load more messages');
    }
  }, [teamId, hasMore, isLoading, messages]);

  // Handle scroll to detect reaching top
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container && container.scrollTop < 50) {
      loadMore();
    }
  }, [loadMore]);

  // Send message
  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/team/${teamId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        // Optimistic add
        setMessages(prev => {
          if (prev.some(m => m.id === data.data.id)) return prev;
          return [...prev, data.data];
        });
        setInput('');

        // Emit via socket for real-time delivery to others
        try {
          const { getSocket } = await import('@/lib/socket');
          const sock = await getSocket();
          sock.emit('team:chat:message', { teamId, message: data.data });
        } catch (err) {
          // Socket delivery is best-effort
        }
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-3"
      >
        {isLoading && (
          <div className="text-center text-zinc-500 text-sm py-4">Loading messages...</div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="text-center text-zinc-500 text-sm py-8">
            No messages yet. Start the conversation!
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-2">
            {/* Avatar */}
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center">
              <span className="text-white text-xs font-medium">
                {msg.user_name.charAt(0).toUpperCase()}
              </span>
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-zinc-200 truncate">
                  {msg.user_name}
                </span>
                <span className="text-xs text-zinc-500 flex-shrink-0">
                  {formatTime(msg.created_at)}
                </span>
              </div>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words">
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-3 py-1.5 bg-red-900/30 text-red-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 ml-2">
            &times;
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-zinc-700/50 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            maxLength={5000}
            disabled={isSending}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isSending}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm rounded-md transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
