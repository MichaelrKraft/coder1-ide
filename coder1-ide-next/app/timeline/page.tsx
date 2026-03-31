'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Clock, FileEdit, Terminal, Save, AlertCircle, RefreshCw, Download, History, X, Edit3, Zap, Film } from 'lucide-react';
import { FlowTracePanel } from '@/components/flowtrace/FlowTracePanel';
import nextDynamic from 'next/dynamic';

const RecordingsDashboard = nextDynamic(() => import('@/components/flight-recorder/RecordingsDashboard'), { ssr: false });
const ReplayView = nextDynamic(() => import('@/components/flight-recorder/ReplayView'), { ssr: false });

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

function TimelineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') ?? 'timeline') as 'timeline' | 'flowtrace' | 'recordings';
  const [replaySessionId, setReplaySessionId] = useState<string | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string>(''); // Current viewing session (changes as user browses)
  const [originalSessionId, setOriginalSessionId] = useState<string>(''); // Original session to return to (never changes)
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [checkpointType, setCheckpointType] = useState<'manual' | 'auto' | 'all'>('manual'); // Checkpoint type filter
  const [editingCheckpoint, setEditingCheckpoint] = useState<string | null>(null); // ID of checkpoint being edited
  const [editTitle, setEditTitle] = useState<string>(''); // Temporary title during editing
  const [selectedCheckpoints, setSelectedCheckpoints] = useState<Set<string>>(new Set()); // Multi-select for bulk delete
  const [selectAllChecked, setSelectAllChecked] = useState(false); // Select all checkbox state
  
  // 🔧 RACE CONDITION FIX: Track fetch requests to cancel stale ones
  const fetchControllerRef = React.useRef<AbortController | null>(null);

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
      fetchTimeline(undefined, checkpointType); // No sessionId = all sessions
    } else if (newSessionId === 'current') {
      fetchTimeline(sessionId, checkpointType);
    } else {
      fetchTimeline(newSessionId, checkpointType);
    }
  };

  const handleTypeChange = (newType: 'manual' | 'auto' | 'all') => {
    setCheckpointType(newType);
    setLoading(true);
    if (selectedSession === 'all') {
      fetchTimeline(undefined, newType);
    } else if (selectedSession === 'current') {
      fetchTimeline(sessionId, newType);
    } else {
      fetchTimeline(selectedSession, newType);
    }
  };

  const fetchTimeline = async (sessionId?: string, type?: 'manual' | 'auto' | 'all') => {
    // 🔧 RACE CONDITION FIX: Cancel previous request if still in flight
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    
    fetchControllerRef.current = new AbortController();
    
    try {
      // 🔧 Dynamic checkpoint type filtering
      const filterType = type || checkpointType;
      const typeParam = filterType === 'all' ? '' : `&type=${filterType}`;
      const url = sessionId 
        ? `/api/timeline?sessionId=${sessionId}${typeParam}` 
        : `/api/timeline${typeParam ? '?' + typeParam.slice(1) : ''}`; // Remove leading & if no sessionId
      
      const response = await fetch(url, { 
        signal: fetchControllerRef.current.signal 
      });
      const data = await response.json();
      if (data.events) {
        setEvents(data.events);
      }
    } catch (error: any) {
      // Ignore abort errors (intentional cancellation)
      if (error.name === 'AbortError') {
        console.log('🚫 Timeline fetch cancelled (newer request started)');
        return;
      }
      // logger?.error('Failed to fetch timeline:', error);
    } finally {
      setLoading(false);
      fetchControllerRef.current = null;
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
        
        // 🔧 RACE CONDITION FIX: Refresh from server instead of optimistic update
        // This prevents stale closure issues and ensures UI matches server state
        if (selectedSession === 'all') {
          await fetchTimeline(undefined, checkpointType);
        } else if (selectedSession === 'current') {
          await fetchTimeline(sessionId, checkpointType);
        } else {
          await fetchTimeline(selectedSession, checkpointType);
        }
        
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

  // Toggle individual checkpoint selection
  const toggleCheckpointSelection = (checkpointId: string) => {
    const newSelected = new Set(selectedCheckpoints);
    if (newSelected.has(checkpointId)) {
      newSelected.delete(checkpointId);
    } else {
      newSelected.add(checkpointId);
    }
    setSelectedCheckpoints(newSelected);
    setSelectAllChecked(newSelected.size === events.length && events.length > 0);
  };

  // Toggle select all checkpoints
  const toggleSelectAll = () => {
    if (selectAllChecked) {
      setSelectedCheckpoints(new Set());
      setSelectAllChecked(false);
    } else {
      const allIds = new Set(events.map(e => e.id));
      setSelectedCheckpoints(allIds);
      setSelectAllChecked(true);
    }
  };

  // Bulk delete selected checkpoints
  const handleBulkDelete = async () => {
    const count = selectedCheckpoints.size;
    if (count === 0) return;
    
    if (!confirm(`Delete ${count} checkpoint${count !== 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    
    try {
      let deleted = 0;
      let failed = 0;

      for (const checkpointId of selectedCheckpoints) {
        const checkpoint = events.find(e => e.id === checkpointId);
        if (checkpoint?.details?.sessionId) {
          try {
            const response = await fetch(`/api/sessions/${checkpoint.details.sessionId}/checkpoints/${checkpointId}`, {
              method: 'DELETE'
            });
            if (response.ok) {
              deleted++;
            } else {
              failed++;
            }
          } catch (error) {
            failed++;
          }
        }
      }

      // Clear selection and refresh
      setSelectedCheckpoints(new Set());
      setSelectAllChecked(false);
      
      if (selectedSession === 'all') {
        await fetchTimeline(undefined, checkpointType);
      } else if (selectedSession === 'current') {
        await fetchTimeline(sessionId, checkpointType);
      } else {
        await fetchTimeline(selectedSession, checkpointType);
      }

      // Show result toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
      toast.innerHTML = `🗑️ Deleted ${deleted} checkpoint${deleted !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}`;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 300);
      }, 3000);
    } finally {
      // 🔧 RACE CONDITION FIX: Always clear loading state, even if operation fails
      setLoading(false);
    }
  };

  // Edit checkpoint title
  const handleEditStart = (checkpointId: string, currentTitle: string) => {
    setEditingCheckpoint(checkpointId);
    setEditTitle(currentTitle);
  };

  const handleEditCancel = () => {
    setEditingCheckpoint(null);
    setEditTitle('');
  };

  const handleEditSave = async (checkpointId: string, sessionId: string) => {
    if (!editTitle.trim()) {
      handleEditCancel();
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${sessionId}/checkpoints/${checkpointId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() })
      });

      if (response.ok) {
        // 🔧 RACE CONDITION FIX: Refresh from server instead of optimistic update
        // This prevents stale closure issues and ensures UI matches server state
        if (selectedSession === 'all') {
          await fetchTimeline(undefined, checkpointType);
        } else if (selectedSession === 'current') {
          await fetchTimeline(sessionId, checkpointType);
        } else {
          await fetchTimeline(selectedSession, checkpointType);
        }
        
        // Show success toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
        toast.innerHTML = '✅ Checkpoint title updated';
        document.body.appendChild(toast);
        
        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => document.body.removeChild(toast), 300);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to update checkpoint title:', error);
    }

    handleEditCancel();
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
      // 🔧 FIX (Dec 14, 2025): Don't fetch checkpoint data here - it can be huge (36MB+) and timeout
      // Instead, store a reference and let the IDE page fetch it with proper loading UI
      // This also avoids sessionStorage quota exceeded errors

      // Find the checkpoint info from our local events state (already loaded in the list)
      const event = events.find(e => e.id === checkpointId);
      const checkpointName = event
        ? formatCheckpointDate(event.timestamp)
        : `Checkpoint ${new Date().toLocaleDateString()}`;

      const pendingSandboxRef = {
        checkpointId,
        sessionId: checkpointSessionId,
        name: checkpointName,
        timestamp: event?.timestamp || Date.now()
      };

      sessionStorage.setItem('pendingSandbox', JSON.stringify(pendingSandboxRef));
      console.log('💾 TIMELINE: Stored sandbox reference:', pendingSandboxRef);

      // Navigate to IDE - it will fetch the full checkpoint data on load
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

        {/* Tab Bar */}
        <div className="flex border-b border-gray-700 mb-6">
          <button
            onClick={() => router.push('/timeline?tab=timeline')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'timeline'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            Checkpoints
          </button>
          <button
            onClick={() => router.push('/timeline?tab=flowtrace')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'flowtrace'
                ? 'border-[#00D9FF] text-[#00D9FF]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            FlowTrace
          </button>
          <button
            onClick={() => router.push('/timeline?tab=recordings')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'recordings'
                ? 'border-[#00D9FF] text-[#00D9FF]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Film className="w-4 h-4" />
            Recordings
          </button>
        </div>

        {activeTab === 'recordings' && (
          <div style={{ height: 'calc(100vh - 180px)' }}>
            {replaySessionId ? (
              <ReplayView
                sessionId={replaySessionId}
                onBack={() => setReplaySessionId(null)}
              />
            ) : (
              <RecordingsDashboard
                onOpenReplay={(id: string) => setReplaySessionId(id)}
              />
            )}
          </div>
        )}

        {activeTab === 'flowtrace' && (
          <div style={{ height: 'calc(100vh - 180px)' }}>
            <FlowTracePanel hideBackButton />
          </div>
        )}

        {activeTab === 'timeline' && (
          <>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">Project Timeline</h1>
          
          {/* Session Selector & Checkpoint Type Filter */}
          <div className="flex items-center gap-4">
            <History className="w-4 h-4 text-gray-400" />
            <select
              value={selectedSession}
              onChange={(e) => handleSessionChange(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="all">All Sessions ({sessions.length})</option>
              <option value="current">🎯 Current Session</option>
              <optgroup label="─────────────────">
                {sessions.slice(0, 20).map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name || session.id.substring(0, 20)}
                  </option>
                ))}
              </optgroup>
            </select>
            
            <Save className="w-4 h-4 text-gray-400" />
            <select
              value={checkpointType}
              onChange={(e) => handleTypeChange(e.target.value as 'manual' | 'auto' | 'all')}
              className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
            >
              <option value="manual">📋 Manual Checkpoints</option>
              <option value="auto">⏰ Auto Checkpoints</option>
              <option value="all">📊 All Checkpoints</option>
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
            {/* Stats Bar with Select All and Bulk Delete */}
            <div className="mb-4 p-3 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                {/* Select All Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer hover:text-cyan-400 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectAllChecked}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-800 cursor-pointer"
                  />
                  <span className="text-gray-400">
                    Select All ({events.length})
                  </span>
                </label>
                
                {/* Checkpoint Count */}
                <span className="text-gray-400">
                  Showing <span className="text-white font-semibold">{events.length}</span> checkpoint{events.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Session & Type Info */}
                <span className="text-gray-500">
                  {selectedSession === 'all' ? `From all ${sessions.length} sessions` : 
                   selectedSession === 'current' ? 'Current session only' :
                   'Selected session'}
                  {' • '}
                  {checkpointType === 'manual' ? 'Manual only' :
                   checkpointType === 'auto' ? 'Auto only' :
                   'All types'}
                </span>
                
                {/* Bulk Delete Button - Only show when checkpoints selected */}
                {selectedCheckpoints.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-white font-medium transition-colors flex items-center gap-2"
                  >
                    🗑️ Delete Selected ({selectedCheckpoints.size})
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-4 max-w-3xl">
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
                    {/* Checkbox for multi-select */}
                    <div className="relative z-10 flex-shrink-0 pt-1">
                      <input
                        type="checkbox"
                        checked={selectedCheckpoints.has(event.id)}
                        onChange={() => toggleCheckpointSelection(event.id)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-800 cursor-pointer"
                      />
                    </div>
                    
                    {/* Timeline line */}
                    {!isLast && (
                      <div className="absolute left-10 top-8 bottom-0 w-0.5 bg-gray-700" />
                    )}
                    
                    {/* Icon */}
                    <div className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
                      {getIcon(event.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 bg-gray-800 rounded-lg p-4 border border-cyan-500/50 hover:border-cyan-500 shadow-glow-cyan transition-colors group">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          {editingCheckpoint === event.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleEditSave(event.id, event.details.sessionId);
                                  } else if (e.key === 'Escape') {
                                    handleEditCancel();
                                  }
                                }}
                                className="flex-1 bg-gray-900 border border-cyan-500 text-white rounded px-2 py-1 text-sm focus:outline-none focus:border-cyan-400"
                                autoFocus
                              />
                              <button
                                onClick={() => handleEditSave(event.id, event.details.sessionId)}
                                className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-xs text-white transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleEditCancel}
                                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <h3 className="text-sm font-semibold text-white">
                              {event.description}
                            </h3>
                          )}
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
                              {/* Edit button */}
                              <button
                                onClick={() => handleEditStart(event.id, event.description)}
                                className="p-1 text-gray-400 hover:text-cyan-400 hover:bg-cyan-900/20 rounded transition-colors"
                                title="Edit checkpoint title"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
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
          </>
        )}
      </div>
    </div>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={null}>
      <TimelineContent />
    </Suspense>
  );
}