'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, FileEdit, Terminal, Save, AlertCircle, RefreshCw, Download, History, X } from 'lucide-react';

interface TimelineEvent {
  id: string;
  timestamp: string | number;
  type: 'file_change' | 'terminal_command' | 'checkpoint' | 'error';
  description: string;
  details?: any;
}

interface Session {
  id: string;
  name: string;
  createdAt: string;
}

export default function TimelinePage() {
  const router = useRouter();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string>(''); // Current viewing session (changes as user browses)
  const [originalSessionId, setOriginalSessionId] = useState<string>(''); // Original session to return to (never changes)
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('all');

  useEffect(() => {
    // Fetch all available sessions
    fetchSessions();
    
    // 🔧 CRITICAL FIX: Use same localStorage key as IDE page ('ide-terminalSessionId')
    // Previous bug: Timeline used 'currentSessionId' but IDE stores to 'ide-terminalSessionId'
    // This caused Back to IDE button to navigate without sessionId, creating new blank terminal
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('sessionId');
    const storedSessionId = urlSessionId || localStorage.getItem('ide-terminalSessionId') || '';
    
    // 🎯 CRITICAL: Set BOTH session IDs
    // - originalSessionId: The session we came FROM (frozen, never changes)
    // - sessionId: Current viewing context (changes as user browses timeline)
    setOriginalSessionId(storedSessionId); // Frozen - this is where "Back to IDE" returns
    setSessionId(storedSessionId); // Can change as user views different sessions
    
    console.log('🔍 [TIMELINE INIT] Original session frozen:', storedSessionId);
    
    // Default to showing all sessions instead of filtering to current
    setSelectedSession('all');
    fetchTimeline(); // Fetch all sessions by default
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      if (data.success && data.sessions) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const handleSessionChange = (newSessionId: string) => {
    setSelectedSession(newSessionId);
    setLoading(true);
    if (newSessionId === 'all') {
      fetchTimeline(); // No sessionId = all sessions
    } else if (newSessionId === 'current') {
      fetchTimeline(sessionId);
    } else {
      fetchTimeline(newSessionId);
    }
  };

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

  const handleDelete = async (checkpointId: string, checkpointSessionId: string) => {
    if (!confirm('Are you sure you want to delete this checkpoint? This action cannot be undone.')) {
      return;
    }

    try {
      const deleteUrl = `/api/sessions/${checkpointSessionId}/checkpoints/${checkpointId}`;
      const response = await fetch(deleteUrl, {
        method: 'DELETE'
      });

      if (response.ok) {
        console.log('✅ Checkpoint deleted successfully');
        // Remove from local state immediately
        setEvents(events.filter(e => e.id !== checkpointId));
        
        // Show success notification
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
        toast.innerHTML = `🗑️ Checkpoint deleted`;
        document.body.appendChild(toast);
        
        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Failed to delete checkpoint: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Failed to delete checkpoint:', error);
      alert(`Failed to delete checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchTimeline(sessionId);
  };

  // Format checkpoint timestamp for display (e.g., "Sep 26, 4:55 pm")
  const formatCheckpointDate = (timestamp: string | number) => {
    const date = new Date(timestamp);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const time = date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();
    return `${month} ${day}, ${time}`;
  };

  const handleRestore = async (checkpointId: string, checkpointSessionId: string) => {
    if (!confirm('Are you sure you want to restore this checkpoint? This will open it in a sandbox tab.')) {
      return;
    }

    console.log('🔄 TIMELINE: Restoring checkpoint to sandbox:', { checkpointId, checkpointSessionId });

    try {
      // Fetch checkpoint data from restore API
      const restoreUrl = `/api/sessions/${checkpointSessionId}/checkpoints/${checkpointId}/restore`;
      console.log('🔗 TIMELINE: Restore URL:', restoreUrl);
      
      const restoreResponse = await fetch(restoreUrl, {
        method: 'POST'
      });

      if (!restoreResponse.ok) {
        const errorData = await restoreResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ TIMELINE: Restore failed:', errorData);
        alert(`Failed to restore checkpoint: ${errorData.error || 'Unknown error'}`);
        return;
      }

      const restoreData = await restoreResponse.json();
      console.log('✅ TIMELINE: Checkpoint data loaded:', {
        hasCheckpoint: !!restoreData.checkpoint,
        hasSnapshot: !!restoreData.checkpoint?.data?.snapshot,
        timestamp: restoreData.checkpoint?.timestamp
      });

      const snapshot = restoreData.checkpoint?.data?.snapshot;
      if (!snapshot) {
        alert('Checkpoint data is incomplete');
        return;
      }

      // Extract terminal history from multiple possible locations
      const terminalHistory = 
        restoreData.checkpoint.terminalHistory ||
        restoreData.checkpoint.data?.terminalHistory ||
        snapshot.terminal || '';

      console.log('📊 TIMELINE: Terminal history length:', terminalHistory.length);

      // Filter out thinking animations from terminal history
      const { filterThinkingAnimations } = await import('@/lib/checkpoint-utils');
      const cleanedTerminalHistory = terminalHistory ? filterThinkingAnimations(terminalHistory) : '';
      
      console.log('🧽 TIMELINE: Filtered terminal history:', {
        before: terminalHistory.length,
        after: cleanedTerminalHistory.length,
        removed: terminalHistory.length - cleanedTerminalHistory.length
      });

      // Parse files and commands from snapshot
      let filesArray = [];
      if (snapshot.files) {
        try {
          const parsed = JSON.parse(snapshot.files);
          filesArray = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.log('⚠️ TIMELINE: Failed to parse files:', e);
        }
      }

      let commandsArray = [];
      if (snapshot.terminal) {
        // Extract commands from terminal history
        const terminalLines = snapshot.terminal.split('\n');
        const promptRegex = /(?:bash-\d+\.\d+\$|╰─\$|\$)\s+(.+)/;
        commandsArray = terminalLines
          .map(line => {
            const match = line.match(promptRegex);
            return match ? match[1].trim() : null;
          })
          .filter(cmd => cmd && cmd.length > 0)
          .slice(-5); // Get last 5 commands
      }

      // Format checkpoint name with date
      const checkpointName = formatCheckpointDate(restoreData.checkpoint.timestamp);
      
      // Create sandbox data matching SessionsPanel structure
      const sandboxData = {
        name: checkpointName,
        files: filesArray,
        commands: commandsArray,
        timestamp: restoreData.checkpoint.timestamp,
        description: 'Restored checkpoint from Timeline',
        originalCheckpoint: restoreData.checkpoint,
        terminalHistory: cleanedTerminalHistory,
        checkpointData: {
          files: filesArray,
          commands: commandsArray,
          timestamp: restoreData.checkpoint.timestamp,
          terminalHistory: cleanedTerminalHistory
        }
      };

      console.log('🏖️ TIMELINE: Creating sandbox with data:', {
        name: sandboxData.name,
        filesCount: filesArray.length,
        commandsCount: commandsArray.length,
        terminalHistoryLength: cleanedTerminalHistory.length
      });

      // Store sandbox data in sessionStorage for IDE to pick up
      sessionStorage.setItem('pendingSandbox', JSON.stringify(sandboxData));
      
      // Navigate to IDE - it will create the sandbox on load
      window.location.href = '/ide';
      
    } catch (error) {
      console.error('❌ TIMELINE: Failed to restore checkpoint:', error);
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
            onClick={() => {
              // 🎯 CRITICAL FIX: Use originalSessionId (frozen on mount), NOT sessionId (changes during browsing)
              // originalSessionId = The session we came FROM (never changes)
              // sessionId = Current viewing context (changes as user browses different sessions)
              console.log('🔍 [TIMELINE] Back to IDE clicked');
              console.log('   Original session (RETURNING TO):', originalSessionId);
              console.log('   Current viewing session:', sessionId);
              console.log('   These may differ if user browsed other sessions');
              
              // Always navigate back to the ORIGINAL session
              router.push(`/ide${originalSessionId ? `?sessionId=${originalSessionId}` : ''}`);
            }}
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
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">Project Timeline</h1>
          
          {/* Session Selector */}
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-gray-400" />
            <select
              value={selectedSession}
              onChange={(e) => handleSessionChange(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="all">📊 All Sessions ({sessions.length})</option>
              <option value="current">🎯 Current Session</option>
              <optgroup label="─────────────────">
                {sessions.slice(0, 20).map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name || session.id.substring(0, 20)}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center text-gray-400">Loading timeline...</div>
        ) : events.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No timeline events yet</p>
            <p className="text-sm text-gray-500 mt-2">Events will appear here as you work on your project</p>
          </div>
        ) : (
          <>
            {/* Stats Bar */}
            <div className="mb-4 p-3 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-between text-sm">
              <span className="text-gray-400">
                Showing <span className="text-white font-semibold">{events.length}</span> checkpoint{events.length !== 1 ? 's' : ''}
              </span>
              <span className="text-gray-500">
                {selectedSession === 'all' ? `From all ${sessions.length} sessions` : 
                 selectedSession === 'current' ? 'Current session only' :
                 'Selected session'}
              </span>
            </div>
            
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
                    <div className="flex-1 bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors group">
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
                            <>
                              <button
                                onClick={() => handleRestore(event.id, event.details.sessionId)}
                                className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-xs transition-colors"
                              >
                                Restore
                              </button>
                              <button
                                onClick={() => handleDelete(event.id, event.details.sessionId)}
                                className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete checkpoint"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
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
          </>
        )}
      </div>
    </div>
  );
}