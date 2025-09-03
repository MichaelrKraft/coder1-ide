'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, FileEdit, Terminal, Save, AlertCircle, RefreshCw, Download } from 'lucide-react';
import { logger } from '@/lib/logger';

interface TimelineEvent {
  id: string;
  timestamp: string | number;
  type: 'file_change' | 'terminal_command' | 'checkpoint' | 'error';
  description: string;
  details?: any;
}

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    // Get sessionId from URL params or localStorage
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('sessionId');
    const storedSessionId = urlSessionId || localStorage.getItem('currentSessionId') || '';
    setSessionId(storedSessionId);
    
    fetchTimeline(storedSessionId);
  }, []);

  const fetchTimeline = async (sessionId?: string) => {
    try {
      const url = sessionId ? `/api/timeline?sessionId=${sessionId}` : '/api/timeline';
      const response = await fetch(url);
      const data = await response.json();
      if (data.events) {
        setEvents(data.events);
      }
    } catch (error) {
      logger.error('Failed to fetch timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchTimeline(sessionId);
  };

  const handleRestore = async (checkpointId: string) => {
    if (!confirm('Are you sure you want to restore this checkpoint? Current work will be saved first.')) {
      return;
    }

    try {
      // First save current state as a checkpoint
      await fetch('/api/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          timestamp: new Date().toISOString(),
          snapshot: {
            files: localStorage.getItem('openFiles') || '[]',
            terminal: localStorage.getItem('terminalHistory') || '',
            editor: localStorage.getItem('editorContent') || '',
            note: 'Auto-save before restore'
          }
        })
      });

      // Then restore the selected checkpoint
      const EXPRESS_BACKEND_URL = 'http://localhost:3000';
      const restoreResponse = await fetch(`${EXPRESS_BACKEND_URL}/api/sessions/${sessionId}/checkpoints/${checkpointId}/restore`, {
        method: 'POST'
      });

      if (restoreResponse.ok) {
        const data = await restoreResponse.json();
        // Apply the restored data to localStorage
        if (data.checkpoint?.data?.snapshot) {
          const snapshot = data.checkpoint.data.snapshot;
          if (snapshot.files) localStorage.setItem('openFiles', snapshot.files);
          if (snapshot.terminal) localStorage.setItem('terminalHistory', snapshot.terminal);
          if (snapshot.editor) localStorage.setItem('editorContent', snapshot.editor);
        }
        alert('Checkpoint restored successfully! Please refresh the IDE.');
      }
    } catch (error) {
      logger.error('Failed to restore checkpoint:', error);
      alert('Failed to restore checkpoint');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'file_change':
        return <FileEdit className="w-4 h-4 text-blue-400" />;
      case 'terminal_command':
        return <Terminal className="w-4 h-4 text-green-400" />;
      case 'checkpoint':
        return <Save className="w-4 h-4 text-purple-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatTime = (timestamp: string | number) => {
    const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp: string | number) => {
    const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/ide" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to IDE
          </Link>
          <div className="flex items-center gap-3">
            {sessionId && (
              <span className="text-xs text-gray-400">
                Session: {sessionId.substring(0, 16)}...
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 rounded transition-colors text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-8">Project Timeline</h1>
        
        {loading ? (
          <div className="text-center text-gray-400">Loading timeline...</div>
        ) : events.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No timeline events yet</p>
            <p className="text-sm text-gray-500 mt-2">Events will appear here as you work on your project</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event, index) => {
              const isFirst = index === 0;
              const isLast = index === events.length - 1;
              const currentDate = formatDate(event.timestamp);
              const prevDate = index > 0 ? formatDate(events[index - 1].timestamp) : null;
              const showDateHeader = currentDate !== prevDate;
              
              return (
                <React.Fragment key={event.id}>
                  {showDateHeader && (
                    <div className="text-sm font-semibold text-gray-500 mt-6 mb-2">
                      {currentDate}
                    </div>
                  )}
                  <div className="relative flex items-start gap-4">
                    {/* Timeline line */}
                    {!isLast && (
                      <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-gray-700" />
                    )}
                    
                    {/* Icon */}
                    <div className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
                      {getIcon(event.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-white">
                            {event.description}
                          </h3>
                          {event.details?.description && (
                            <p className="text-xs text-gray-400 mt-1">
                              {event.details.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className="text-xs text-gray-500">
                            {formatTime(event.timestamp)}
                          </span>
                          {event.type === 'checkpoint' && (
                            <button
                              onClick={() => handleRestore(event.id)}
                              className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-xs transition-colors"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </div>
                      {event.details?.metadata?.tags && (
                        <div className="flex gap-1 mt-2">
                          {event.details.metadata.tags.map((tag: string) => (
                            <span
                              key={tag}
                              className="text-xs px-1.5 py-0.5 bg-gray-700 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {event.details && !event.details.description && !event.details.metadata?.tags && (
                        <pre className="text-xs text-gray-400 font-mono overflow-x-auto mt-2">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}