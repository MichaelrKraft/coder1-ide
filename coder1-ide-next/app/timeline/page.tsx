'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, FileEdit, Terminal, Save, AlertCircle, RefreshCw, Download } from 'lucide-react';

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
      // logger?.error('Failed to fetch timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchTimeline(sessionId);
  };

  const handleRestore = async (checkpointId: string, checkpointSessionId: string) => {
    if (!confirm('Are you sure you want to restore this checkpoint? Current work will be saved first.')) {
      return;
    }

    console.log('🔄 Restoring checkpoint:', { checkpointId, checkpointSessionId });
    
    // 🔍 DEBUG: Find and log the checkpoint being restored
    const checkpointEvent = events.find(e => e.id === checkpointId && e.type === 'checkpoint');
    if (checkpointEvent) {
      const terminalHistory = checkpointEvent.details?.terminalHistory || 
                             checkpointEvent.details?.data?.terminalHistory || 
                             checkpointEvent.details?.snapshot?.terminal || '';
      console.log(`📊 TIMELINE DEBUG: Restoring checkpoint with terminal history length: ${terminalHistory.length} characters`);
      if (terminalHistory.length === 0) {
        console.warn(`⚠️ TIMELINE WARNING: This checkpoint has NO terminal history!`);
      }
    }

    try {
      // First save current state as a checkpoint
      await fetch('/api/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionId || checkpointSessionId,
          timestamp: new Date().toISOString(),
          snapshot: {
            files: localStorage.getItem('openFiles') || '[]',
            terminal: localStorage.getItem('terminalHistory') || '',
            editor: localStorage.getItem('editorContent') || '',
            note: 'Auto-save before restore'
          }
        })
      });

      // Then restore the selected checkpoint using the checkpoint's own sessionId
      const restoreUrl = `/api/sessions/${checkpointSessionId}/checkpoints/${checkpointId}/restore`;
      console.log('🔗 Restore URL:', restoreUrl);
      
      const restoreResponse = await fetch(restoreUrl, {
        method: 'POST'
      });

      console.log('📡 Restore response:', { ok: restoreResponse.ok, status: restoreResponse.status });

      if (restoreResponse.ok) {
        const data = await restoreResponse.json();
        console.log('✅ Restore successful, applying data to localStorage');
        console.log('📦 Full restore data:', data);
        console.log('📦 Checkpoint structure:', {
          hasCheckpoint: !!data.checkpoint,
          hasData: !!data.checkpoint?.data,
          hasSnapshot: !!data.checkpoint?.data?.snapshot,
          topLevelTerminalHistory: !!data.checkpoint?.terminalHistory,
          dataLevelTerminalHistory: !!data.checkpoint?.data?.terminalHistory,
          snapshotTerminal: !!data.checkpoint?.data?.snapshot?.terminal
        });
        
        // Apply the restored data to localStorage with quota handling
        if (data.checkpoint?.data?.snapshot) {
          const snapshot = data.checkpoint.data.snapshot;
          
          // Files - should be small, restore normally
          if (snapshot.files) {
            try {
              localStorage.setItem('openFiles', snapshot.files);
            } catch (e) {
              console.warn('⚠️ Could not restore files:', e);
            }
          }
          
          // 🔧 FIX: Terminal history can be in multiple locations in checkpoint JSON
          // Check all possible locations to ensure we find it
          const terminalHistory = 
            data.checkpoint.terminalHistory ||           // Top-level (preferred location)
            data.checkpoint.data?.terminalHistory ||     // Inside data object  
            snapshot.terminal;                           // Legacy location (fallback)
          
          console.log('🔍 Terminal history extraction:', {
            topLevel: !!data.checkpoint.terminalHistory,
            dataLevel: !!data.checkpoint.data?.terminalHistory,
            snapshotLevel: !!snapshot.terminal,
            foundLength: terminalHistory?.length || 0
          });
          
          // Terminal history - can be VERY large, truncate if needed
          if (terminalHistory) {
            try {
              // First try to store as-is
              localStorage.setItem('terminalHistory', terminalHistory);
              console.log(`✅ Terminal history restored successfully (${terminalHistory.length} characters)`);
            } catch (e) {
              // If quota exceeded, truncate to last 100KB (roughly last 1000 lines)
              console.warn(`⚠️ Terminal history too large for localStorage (${terminalHistory.length} chars), truncating...`);
              const maxSize = 100 * 1024; // 100KB
              const truncated = terminalHistory.slice(-maxSize);
              try {
                localStorage.setItem('terminalHistory', truncated);
                console.log(`✅ Terminal history truncated: ${terminalHistory.length} → ${truncated.length} characters`);
              } catch (e2) {
                // If still too large, skip terminal history restoration
                console.warn('⚠️ Could not restore terminal history even after truncation');
                localStorage.removeItem('terminalHistory'); // Clear any existing data
              }
            }
          } else {
            console.warn('⚠️ No terminal history found in checkpoint');
          }
          
          // Editor content - should be small, restore normally
          if (snapshot.editor) {
            try {
              localStorage.setItem('editorContent', snapshot.editor);
            } catch (e) {
              console.warn('⚠️ Could not restore editor content:', e);
            }
          }
        }
        
        // Navigate back to IDE with restore indicator
        window.location.href = `/ide?restored=true&checkpointId=${checkpointId}&sessionId=${checkpointSessionId}`;
      } else {
        const errorData = await restoreResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Restore failed:', errorData);
        alert(`Failed to restore checkpoint: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Failed to restore checkpoint:', error);
      alert(`Failed to restore checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
          <button 
            onClick={() => window.history.back()} 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to IDE
          </button>
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
                          {/* Terminal History Length Indicator for Checkpoints */}
                          {event.type === 'checkpoint' && (
                            <div className="mt-2 flex items-center gap-2">
                              <Terminal className="w-3 h-3 text-gray-500" />
                              <span className="text-xs text-gray-400">
                                Terminal: {(() => {
                                  const terminalHistory = event.details?.terminalHistory || 
                                                         event.details?.data?.terminalHistory || 
                                                         event.details?.snapshot?.terminal || '';
                                  const length = terminalHistory.length;
                                  if (length === 0) {
                                    return <span className="text-orange-400">No terminal history</span>;
                                  } else if (length < 1000) {
                                    return `${length} chars`;
                                  } else {
                                    return `${(length / 1024).toFixed(1)} KB`;
                                  }
                                })()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className="text-xs text-gray-500">
                            {formatTime(event.timestamp)}
                          </span>
                          {event.type === 'checkpoint' && event.details?.sessionId && (
                            <button
                              onClick={() => handleRestore(event.id, event.details.sessionId)}
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