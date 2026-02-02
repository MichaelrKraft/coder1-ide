import React, { useState, useEffect } from 'react';
import { useMemoryStore } from '@/stores/useMemoryStore';
import { Link2, ChevronRight, Download, Share2, Check } from 'lucide-react';

interface SessionData {
  id: string;
  timestamp: Date;
  memoriesCount: number;
  patternsLearned: number;
  connected: boolean;
  isCurrent?: boolean;
}

export const SessionHandoffVisualizer: React.FC = () => {
  const { sessionsConnected, totalPatterns, isPremium } = useMemoryStore();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [handoffPreview, setHandoffPreview] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  useEffect(() => {
    // Generate session data for visualization
    const now = new Date();
    const sessionData: SessionData[] = [];
    
    for (let i = 0; i < 5; i++) {
      const sessionTime = new Date(now);
      sessionTime.setHours(sessionTime.getHours() - (i * 4)); // Sessions every 4 hours
      
      sessionData.unshift({
        id: `session_${5 - i}`,
        timestamp: sessionTime,
        memoriesCount: Math.floor(Math.random() * 50) + 20,
        patternsLearned: Math.floor(Math.random() * 10) + 2,
        connected: i < sessionsConnected,
        isCurrent: i === 0,
      });
    }
    
    setSessions(sessionData);
  }, [sessionsConnected]);

  const handleTestHandoff = () => {
    setHandoffPreview(true);
    setTimeout(() => setHandoffPreview(false), 5000);
  };

  const handleExportContext = () => {
    // Simulate export
    const contextData = {
      sessionsConnected,
      totalPatterns,
      exportedAt: new Date().toISOString(),
      memories: sessions.reduce((total, session) => total + session.memoriesCount, 0)
    };
    
    const blob = new Blob([JSON.stringify(contextData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `context_memory_${Date.now()}.json`;
    a.click();
    
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  if (!isPremium) {
    return null;
  }

  return (
    <div className="bg-bg-tertiary rounded-lg p-3 border border-border-default">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-text-muted" />
          <h3 className="text-xs font-medium text-text-secondary">
            Session Continuity Timeline
          </h3>
        </div>
        <button
          onClick={handleTestHandoff}
          className="px-2 py-1 text-xs bg-bg-secondary hover:bg-bg-primary text-text-secondary rounded border border-border-default transition-colors"
        >
          Test Handoff
        </button>
      </div>

      {/* Session Timeline */}
      <div className="relative mb-3">
        {sessions.map((session, index) => (
          <div key={session.id} className="flex items-center mb-2.5">
            {/* Session Node */}
            <div className="relative">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  session.isCurrent
                    ? 'bg-coder1-cyan text-black'
                    : session.connected
                    ? 'bg-coder1-cyan/20 text-coder1-cyan border border-coder1-cyan/30'
                    : 'bg-bg-secondary text-text-muted border border-border-default'
                }`}
              >
                #{5 - index}
              </div>
              {index < sessions.length - 1 && (
                <div
                  className={`absolute top-8 left-4 w-0.5 h-6 -translate-x-1/2 ${
                    session.connected && sessions[index + 1].connected
                      ? 'bg-coder1-cyan/50'
                      : 'bg-border-default'
                  }`}
                />
              )}
            </div>

            {/* Session Info */}
            <div className="ml-3 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${
                  session.isCurrent ? 'text-text-primary' : 'text-text-secondary'
                }`}>
                  {session.isCurrent ? 'Current' : `Session ${5 - index}`}
                </span>
              </div>
              <div className="text-xs text-text-muted">
                {session.memoriesCount} memories • {session.patternsLearned} patterns
              </div>
              <div className="text-xs text-text-muted">
                {session.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Connection Status */}
            {index > 0 && (
              <div className={`text-xs px-1.5 py-0.5 rounded ${
                session.connected
                  ? 'bg-coder1-cyan/10 text-coder1-cyan border border-coder1-cyan/20'
                  : 'bg-bg-secondary text-text-muted border border-border-default'
              }`}>
                {session.connected ? 'Connected' : 'Disconnected'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Handoff Preview */}
      {handoffPreview && (
        <div className="bg-bg-secondary border border-border-default rounded p-2 mb-3 animate-slideIn">
          <div className="text-xs font-medium text-text-primary mb-1.5">Next session will remember:</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Check className="w-3 h-3 text-coder1-cyan" />
              <span>All {totalPatterns} learned patterns</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Check className="w-3 h-3 text-coder1-cyan" />
              <span>Project context and structure</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Check className="w-3 h-3 text-coder1-cyan" />
              <span>Recent commands and solutions</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};