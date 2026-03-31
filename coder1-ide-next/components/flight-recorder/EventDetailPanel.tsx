'use client';

import React from 'react';
import { Terminal, FileText, Cpu, AlertTriangle, GitCommit, MessageSquare, FolderOpen } from 'lucide-react';
import type { FlightEvent } from '@/lib/flight-recorder/types';

interface EventDetailPanelProps {
  event: FlightEvent | null;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  'terminal:input': { icon: <Terminal size={14} />, label: 'Terminal Input', color: 'text-cyan-400' },
  'terminal:output': { icon: <Terminal size={14} />, label: 'Terminal Output', color: 'text-blue-400' },
  'file:save': { icon: <FileText size={14} />, label: 'File Saved', color: 'text-green-400' },
  'file:open': { icon: <FolderOpen size={14} />, label: 'File Opened', color: 'text-emerald-400' },
  'ai:prompt': { icon: <Cpu size={14} />, label: 'AI Prompt', color: 'text-purple-400' },
  'ai:response': { icon: <Cpu size={14} />, label: 'AI Response', color: 'text-violet-400' },
  'ai:tool_use': { icon: <Cpu size={14} />, label: 'AI Tool Use', color: 'text-indigo-400' },
  'error:terminal': { icon: <AlertTriangle size={14} />, label: 'Terminal Error', color: 'text-red-400' },
  'error:runtime': { icon: <AlertTriangle size={14} />, label: 'Runtime Error', color: 'text-red-400' },
  'git:commit': { icon: <GitCommit size={14} />, label: 'Git Commit', color: 'text-yellow-400' },
  'git:branch': { icon: <GitCommit size={14} />, label: 'Branch Switch', color: 'text-yellow-300' },
  'annotation': { icon: <MessageSquare size={14} />, label: 'Annotation', color: 'text-orange-400' },
};

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function getEventContent(event: FlightEvent): string {
  const d = event.data;
  switch (event.type) {
    case 'terminal:input': return typeof d.input === 'string' ? d.input : '';
    case 'terminal:output': return typeof d.output === 'string' ? d.output.substring(0, 2000) : '';
    case 'file:save':
    case 'file:open': return typeof d.fileName === 'string' ? d.fileName : typeof d.path === 'string' ? d.path : '';
    case 'ai:prompt': return typeof d.prompt === 'string' ? d.prompt : '';
    case 'ai:response': return typeof d.content === 'string' ? d.content.substring(0, 2000) : '';
    case 'ai:tool_use': return `${d.toolName || 'unknown'}: ${typeof d.input === 'string' ? d.input.substring(0, 500) : ''}`;
    case 'error:terminal':
    case 'error:runtime': return typeof d.message === 'string' ? d.message : '';
    case 'git:commit': return typeof d.message === 'string' ? d.message : '';
    case 'annotation': return typeof d.text === 'string' ? d.text : '';
    default: return JSON.stringify(d, null, 2);
  }
}

export default function EventDetailPanel({ event }: EventDetailPanelProps) {
  if (!event) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        Select an event to view details
      </div>
    );
  }

  const config = TYPE_CONFIG[event.type] || { icon: null, label: event.type, color: 'text-gray-400' };
  const content = getEventContent(event);
  const isError = event.type.startsWith('error:');

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700 bg-gray-900/50 shrink-0">
        <span className={config.color}>{config.icon}</span>
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
        <span className="text-xs text-gray-500 ml-auto font-mono">
          {formatTimestamp(event.clientTimestamp)}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        <pre
          className={`text-sm font-mono whitespace-pre-wrap break-words ${
            isError ? 'text-red-300 bg-red-950/30 p-2 rounded border border-red-800/40' : 'text-gray-300'
          }`}
        >
          {content || '(empty)'}
        </pre>
      </div>
    </div>
  );
}
