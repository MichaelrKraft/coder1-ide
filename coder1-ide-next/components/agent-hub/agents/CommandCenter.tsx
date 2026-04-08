'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, Loader2, WifiOff, Paperclip, X, Image } from 'lucide-react';
import { getSocket } from '@/lib/socket';

function stripAnsi(str: string): string {
  return str
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')  // CSI sequences
    .replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, '') // OSC sequences
    .replace(/\x1b[^[\]]/g, '')               // other ESC sequences
    .replace(/\x07/g, '')                     // Bell
    .replace(/\r/g, '\n')                     // CR → newline
    .replace(/\n{3,}/g, '\n\n');              // collapse blank lines
}

interface Attachment {
  name: string;
  type: string;
  dataUrl: string; // base64 data URL for display
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  attachments?: Attachment[];
}

interface CommandCenterProps {
  agentId: string;
  agentName: string;
  workspacePath: string;
  systemPrompt: string;
}

export default function CommandCenter({ agentId, agentName, workspacePath, systemPrompt }: CommandCenterProps) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Awaited<ReturnType<typeof getSocket>> | null>(null);

  // Load chat history on mount
  useEffect(() => {
    fetch(`/api/agent-hub/agents/${agentId}/chat`)
      .then(r => r.json())
      .then(data => setMessages((data.messages || []).map((m: ChatMessage) => ({ ...m, content: stripAnsi(m.content) }))))
      .catch(() => {});
  }, [agentId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamBuffer]);

  // Use the shared authenticated socket
  useEffect(() => {
    let streamTimeout: NodeJS.Timeout;
    let mounted = true;

    const onChatStarted = (data: { agentId: string }) => {
      if (data.agentId === agentId && mounted) setConnected(true);
    };

    const onChatOutput = (data: { agentId: string; chunk: string }) => {
      if (data.agentId !== agentId || !mounted) return;
      setStreaming(true);
      setStreamBuffer(prev => prev + stripAnsi(data.chunk));

      clearTimeout(streamTimeout);
      streamTimeout = setTimeout(() => {
        setStreamBuffer(buf => {
          if (buf.trim()) {
            const msg: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: buf.trim(),
              createdAt: new Date().toISOString(),
            };
            setMessages(prev => [...prev, msg]);
            fetch(`/api/agent-hub/agents/${agentId}/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: 'assistant', content: buf.trim() }),
            }).catch(() => {});
          }
          return '';
        });
        setStreaming(false);
      }, 2000);
    };

    const onChatStopped = (data: { agentId: string; reason: string; error?: string }) => {
      if (data.agentId !== agentId || !mounted) return;
      setConnected(false);
      if (data.reason === 'idle_timeout') {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '[Session timed out after 15 minutes of inactivity]',
          createdAt: new Date().toISOString(),
        }]);
      } else if (data.reason === 'error' && data.error) {
        setError(data.error);
      }
    };

    // Connect using the shared authenticated socket
    getSocket().then(socket => {
      if (!mounted) return;
      socketRef.current = socket;

      socket.on('agent:chat:started', onChatStarted);
      socket.on('agent:chat:output', onChatOutput);
      socket.on('agent:chat:stopped', onChatStopped);

      // Start chat session
      setError('');
      socket.emit('agent:chat:start', {
        agentId,
        workspacePath,
        context: systemPrompt,
      });
    }).catch(err => {
      if (mounted) setError(`Socket connection failed: ${err.message}`);
    });

    return () => {
      mounted = false;
      clearTimeout(streamTimeout);
      if (socketRef.current) {
        socketRef.current.emit('agent:chat:stop', { agentId });
        socketRef.current.off('agent:chat:started', onChatStarted);
        socketRef.current.off('agent:chat:output', onChatOutput);
        socketRef.current.off('agent:chat:stopped', onChatStopped);
        // Don't disconnect — it's the shared socket
        socketRef.current = null;
      }
    };
  }, [agentId, workspacePath, systemPrompt]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) return; // 5MB limit
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type,
          dataUrl: reader.result as string,
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = ''; // reset input
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSend = useCallback(() => {
    if ((!input.trim() && attachments.length === 0) || !socketRef.current || !connected) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      createdAt: new Date().toISOString(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    setMessages(prev => [...prev, msg]);

    // Build message content with attachment descriptions
    let fullMessage = input.trim();
    if (attachments.length > 0) {
      const attachmentDesc = attachments.map(a => `[Attached: ${a.name}]`).join(' ');
      fullMessage = fullMessage ? `${fullMessage}\n\n${attachmentDesc}` : attachmentDesc;
    }

    socketRef.current.emit('agent:chat:input', { agentId, message: fullMessage });

    fetch(`/api/agent-hub/agents/${agentId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user', content: fullMessage }),
    }).catch(() => {});

    setInput('');
    setAttachments([]);
  }, [input, attachments, connected, agentId]);

  const hasMessages = messages.length > 0 || streaming;
  const inputBar = (
    <div className="shrink-0">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="px-3 pt-2 flex gap-2 flex-wrap">
          {attachments.map((att, i) => (
            <div key={i} className="relative group">
              {att.type.startsWith('image/') ? (
                <img src={att.dataUrl} alt={att.name} className="w-16 h-16 rounded border border-border-default object-cover" />
              ) : (
                <div className="w-16 h-16 rounded border border-border-default bg-bg-tertiary flex items-center justify-center">
                  <Image className="w-4 h-4 text-text-muted" />
                </div>
              )}
              <button
                onClick={() => removeAttachment(i)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
              <p className="text-[8px] text-text-muted truncate w-16 mt-0.5">{att.name}</p>
            </div>
          ))}
        </div>
      )}
      <div className="px-3 py-2 border-t border-border-default">
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf,.txt,.md,.json,.csv" multiple className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!connected}
            className="px-2 py-1.5 text-text-muted hover:text-coder1-cyan transition-colors disabled:opacity-30"
            title="Attach file"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={connected ? 'Type a message...' : 'Connecting...'}
            disabled={!connected}
            className="flex-1 bg-bg-tertiary border border-border-default rounded px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-coder1-cyan/50 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && attachments.length === 0) || !connected || streaming}
            className="px-2.5 py-1.5 bg-coder1-cyan/10 text-coder1-cyan rounded hover:bg-coder1-cyan/20 transition-colors disabled:opacity-30"
          >
            {streaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full bg-bg-secondary flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-default shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-3 h-3 text-coder1-cyan" />
          <span className="text-xs font-semibold text-text-primary">{agentName}</span>
          <span className={`flex items-center gap-1 text-[10px] ${connected ? 'text-green-400' : 'text-text-muted'}`}>
            {connected ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Connected
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                {error || 'Connecting...'}
              </>
            )}
          </span>
        </div>
      </div>

      {!hasMessages ? (
        /* Empty state: input centered vertically */
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <MessageCircle className="w-8 h-8 text-text-muted/30 mb-3" />
          <p className="text-xs text-text-muted text-center mb-1">
            Chat with {agentName}
          </p>
          <p className="text-[10px] text-text-muted/60 text-center mb-6">
            Messages are routed through Claude Code via the bridge.
          </p>
          <div className="w-full max-w-md">
            {inputBar}
          </div>
        </div>
      ) : (
        /* Active chat: messages scroll, input at bottom */
        <>
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg text-xs whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-coder1-cyan/10 text-coder1-cyan'
                    : 'bg-bg-tertiary text-text-primary'
                }`}>
                  {/* Attachment thumbnails */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex gap-1.5 p-2 pb-0">
                      {msg.attachments.map((att, i) => (
                        att.type.startsWith('image/') ? (
                          <img key={i} src={att.dataUrl} alt={att.name} className="max-w-[200px] max-h-[150px] rounded object-cover" />
                        ) : (
                          <div key={i} className="px-2 py-1 bg-bg-secondary rounded text-[10px] text-text-muted">
                            {att.name}
                          </div>
                        )
                      ))}
                    </div>
                  )}
                  {msg.content && <div className="px-2.5 py-1.5">{msg.content}</div>}
                </div>
              </div>
            ))}
            {streaming && streamBuffer && (
              <div className="flex justify-start">
                <div className="max-w-[80%] px-2.5 py-1.5 rounded-lg text-xs bg-bg-tertiary text-text-primary whitespace-pre-wrap">
                  {streamBuffer}
                  <span className="animate-pulse ml-1">|</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {inputBar}
        </>
      )}
    </div>
  );
}
