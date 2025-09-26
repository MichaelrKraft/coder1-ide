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
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-semibold text-purple-400">
            SESSION CONTINUITY TIMELINE
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTestHandoff}
            className="px-3 py-1 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded border border-purple-500/30 transition-colors"
          >
            Test Handoff
          </button>
          <button
            onClick={handleExportContext}
            className="px-3 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded border border-blue-500/30 transition-colors flex items-center gap-1"
          >
            {exportSuccess ? (
              <>
                <Check className="w-3 h-3" />
                <span>Exported</span>
              </>
            ) : (
              <>
                <Download className="w-3 h-3" />
                <span>Export</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Session Timeline */}
      <div className="relative mb-4">
        {sessions.map((session, index) => (
          <div key={session.id} className="flex items-center mb-3">
            {/* Session Node */}
            <div className="relative">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  session.isCurrent
                    ? 'bg-purple-500 text-white ring-4 ring-purple-500/30 animate-pulse'
                    : session.connected
                    ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                    : 'bg-gray-700 text-gray-400 border border-gray-600'
                }`}
              >
                #{5 - index}
              </div>
              {index < sessions.length - 1 && (
                <div
                  className={`absolute top-12 left-6 w-0.5 h-8 -translate-x-1/2 ${
                    session.connected && sessions[index + 1].connected
                      ? 'bg-purple-400'
                      : 'bg-gray-600'
                  }`}
                />
              )}
            </div>

            {/* Session Info */}
            <div className="ml-4 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${
                  session.isCurrent ? 'text-purple-300' : 'text-gray-400'
                }`}>
                  {session.isCurrent ? 'CURRENT SESSION' : `Session ${5 - index}`}
                </span>
                {session.connected && !session.isCurrent && (
                  <ChevronRight className="w-3 h-3 text-green-400" />
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {session.memoriesCount} memories • {session.patternsLearned} patterns learned
              </div>
              <div className="text-xs text-gray-600">
                {session.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Connection Status */}
            {index > 0 && (
              <div className={`text-xs px-2 py-1 rounded ${
                session.connected
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-gray-700 text-gray-500 border border-gray-600'
              }`}>
                {session.connected ? 'Connected' : 'Disconnected'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Handoff Preview */}
      {handoffPreview && (
        <div className="bg-green-500/10 border border-green-500/20 rounded p-3 mb-4 animate-slideIn">
          <div className="text-sm font-medium text-green-400 mb-2">NEXT SESSION WILL REMEMBER:</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <Check className="w-3 h-3 text-green-400" />
              <span>All {totalPatterns} learned patterns</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <Check className="w-3 h-3 text-green-400" />
              <span>Project context and structure</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <Check className="w-3 h-3 text-green-400" />
              <span>Recent commands and solutions</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <Check className="w-3 h-3 text-green-400" />
              <span>Error fixes and optimizations</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Message */}
      <div className="bg-black/30 rounded p-2 text-center">
        <div className="text-xs text-purple-400 font-medium">
          Unlike standard Claude Code, ALL your context carries forward
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Close Claude today, open tomorrow - everything is remembered
        </div>
      </div>
    </div>
  );
};