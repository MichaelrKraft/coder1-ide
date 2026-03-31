'use client';

import React, { useRef, useEffect, useState } from 'react';
import { User, Bot, Wrench, ChevronDown, ChevronRight, MessageSquareOff } from 'lucide-react';
import type { FlightEvent } from '@/lib/flight-recorder/types';

interface AIConversationPanelProps {
  /** AI-related events (ai:prompt, ai:response, ai:tool_use) */
  events: FlightEvent[];
  /** ID of the currently playing event for highlight */
  currentEventId: string | null;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function ToolUseCard({ event, isActive }: { event: FlightEvent; isActive: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const toolName = typeof event.data.tool === 'string' ? event.data.tool : 'tool';
  const toolInput = typeof event.data.input === 'string' ? event.data.input : null;

  return (
    <div
      className={`mx-4 my-1 rounded border transition-colors ${
        isActive
          ? 'border-cyan-500/50 bg-cyan-950/20'
          : 'border-gray-700/50 bg-gray-800/30'
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-left"
      >
        <Wrench size={12} className="text-yellow-400 shrink-0" />
        <span className="text-xs text-gray-400 font-mono truncate">{toolName}</span>
        <span className="text-[10px] text-gray-600 ml-auto shrink-0">
          {formatTime(event.clientTimestamp)}
        </span>
        {expanded ? (
          <ChevronDown size={12} className="text-gray-500 shrink-0" />
        ) : (
          <ChevronRight size={12} className="text-gray-500 shrink-0" />
        )}
      </button>
      {expanded && toolInput && (
        <div className="px-3 pb-2 border-t border-gray-700/30">
          <pre className="text-[11px] text-gray-500 font-mono whitespace-pre-wrap break-words mt-1.5 max-h-32 overflow-y-auto">
            {toolInput}
          </pre>
        </div>
      )}
    </div>
  );
}

function ChatBubble({
  event,
  isActive,
}: {
  event: FlightEvent;
  isActive: boolean;
}) {
  const isPrompt = event.type === 'ai:prompt';
  const content = typeof event.data.text === 'string'
    ? event.data.text
    : typeof event.data.prompt === 'string'
      ? event.data.prompt
      : typeof event.data.response === 'string'
        ? event.data.response
        : '';

  const truncated = content.length > 500 ? content.slice(0, 500) + '...' : content;

  return (
    <div className={`flex gap-2 px-4 py-2 ${isPrompt ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
          isPrompt ? 'bg-blue-600/20' : 'bg-cyan-600/20'
        }`}
      >
        {isPrompt ? (
          <User size={12} className="text-blue-400" />
        ) : (
          <Bot size={12} className="text-cyan-400" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm transition-all ${
          isPrompt
            ? 'bg-blue-600/10 border border-blue-500/20 text-gray-200'
            : 'bg-gray-800 border border-gray-700 text-gray-300'
        } ${isActive ? 'ring-1 ring-cyan-500/50 shadow-[0_0_8px_rgba(0,217,255,0.15)]' : ''}`}
      >
        <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">{truncated}</p>
        <span className="block text-[10px] text-gray-600 mt-1 text-right">
          {formatTime(event.clientTimestamp)}
        </span>
      </div>
    </div>
  );
}

export default function AIConversationPanel({
  events,
  currentEventId,
}: AIConversationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active event during playback
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentEventId]);

  if (events.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
        <MessageSquareOff size={24} className="opacity-50" />
        <span className="text-xs">No AI interactions in this segment</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-3 py-1.5 border-b border-gray-700 bg-gray-900">
        <Bot size={14} className="text-cyan-400 mr-2" />
        <span className="text-xs text-gray-400 font-mono">AI Conversation</span>
        <span className="text-[10px] text-gray-600 ml-auto">{events.length} events</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-2 space-y-1">
        {events.map((event) => {
          const isActive = event.id === currentEventId;
          return (
            <div key={event.id} ref={isActive ? activeRef : undefined}>
              {event.type === 'ai:tool_use' ? (
                <ToolUseCard event={event} isActive={isActive} />
              ) : (
                <ChatBubble event={event} isActive={isActive} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
